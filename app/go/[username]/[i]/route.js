import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { displayLinks } from '@/lib/creators';

export const dynamic = 'force-dynamic';

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|discord|telegram|headless/i;

/** A "My Links" button: count the tap, then send the visitor on to the creator's link. */
export async function GET(req, { params }) {
  const { username, i } = await params;
  const user = await prisma.user.findUnique({
    where: { username: String(username).toLowerCase() },
    select: { id: true, bannedAt: true, creatorLinks: true },
  });
  const link = user && !user.bannedAt ? displayLinks(user)[parseInt(i, 10)] : null;
  if (!link) return NextResponse.redirect(new URL(`/${username}`, req.url));
  if (!BOTS.test(req.headers.get('user-agent') || '')) {
    await prisma.linkClick.create({ data: { ownerId: user.id, label: link.text.slice(0, 40) } }).catch(() => {});
  }
  return NextResponse.redirect(link.url, 302);
}
