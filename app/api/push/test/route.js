import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { pushConfigured, sendPushNow } from '@/lib/push';

export const dynamic = 'force-dynamic';

/** "Send me a test notification" button. */
export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ error: "Notifications aren't set up on the site yet." }, { status: 400 });
  const sent = await sendPushNow(me.id, {
    title: 'BFRENZ notifications are on 🎉',
    body: "You'll hear about new IMs, comments, mail and friend requests.",
    url: '/home',
    tag: 'test',
  });
  return NextResponse.json({ ok: sent > 0, sent });
}
