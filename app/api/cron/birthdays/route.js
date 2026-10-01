import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { birthdayKeys, localDate } from '@/lib/birthdays';
import { imBuddyIds } from '@/lib/im';
import { pushConfigured, sendPushNow } from '@/lib/push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Runs once a day (see vercel.json). For everyone whose birthday is today:
 * tells their frenz, and wishes them a happy birthday. Each person is only done once a year,
 * so running it twice is harmless.
 */
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!pushConfigured()) return NextResponse.json({ skipped: 'push not set up' });

  const today = localDate();
  const people = await prisma.user.findMany({
    where: {
      bannedAt: null,
      OR: birthdayKeys(today),
      NOT: { bdayPushYear: today.year },
    },
    select: { id: true, username: true, displayName: true },
    take: 500,
  });

  let sent = 0;
  for (const p of people) {
    // Claim this person for this year first, so a second run can't double-send.
    const claimed = await prisma.user.updateMany({
      where: { id: p.id, OR: [{ bdayPushYear: null }, { bdayPushYear: { not: today.year } }] },
      data: { bdayPushYear: today.year },
    });
    if (!claimed.count) continue;

    await sendPushNow(p.id, {
      title: `🎉 Happy birthday, ${p.displayName}!`,
      body: 'From everyone at BFRENZ. Your frenz just got the memo 🎂',
      url: `/${p.username}`,
      tag: 'bday-me',
    }).catch(() => 0);

    const frenz = await imBuddyIds(p.id); // accepted frenz, minus blocks
    const results = await Promise.allSettled(
      frenz.map((id) =>
        sendPushNow(id, {
          title: `🎂 It's ${p.displayName}'s birthday!`,
          body: 'Leave them a birthday comment 🎉',
          url: `/${p.username}?bday=1#add-comment`,
          tag: `bday-${p.id}`,
        }),
      ),
    );
    sent += results.filter((r) => r.status === 'fulfilled' && r.value > 0).length;
  }
  return NextResponse.json({ birthdays: people.length, notified: sent });
}
