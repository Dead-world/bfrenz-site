import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { supportButtons } from '@/lib/support';

export const dynamic = 'force-dynamic';

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|discord|telegram|headless/i;

/** A "Support me" button: count the tap (for the creator's stats), then open the payment app. */
export async function GET(req, { params }) {
  const { username, kind } = await params;
  const user = await prisma.user.findUnique({
    where: { username: String(username).toLowerCase() },
    select: { id: true, bannedAt: true, supportLinks: true },
  });
  const btn = user && !user.bannedAt ? supportButtons(user).find((b) => b.kind === kind) : null;
  if (!btn) return NextResponse.redirect(new URL(`/${username}`, req.url));
  if (!BOTS.test(req.headers.get('user-agent') || '')) {
    await prisma.linkClick.create({ data: { ownerId: user.id, label: `💸 ${btn.label}` } }).catch(() => {});
  }
  return NextResponse.redirect(btn.url, 302);
}
