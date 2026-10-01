import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const AWAY_MAX = 200;

/** Set or clear (empty message) your IM away message. */
export async function POST(req) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'login' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const message = String(body?.message || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, AWAY_MAX);
  await prisma.user.update({
    where: { id: me.id },
    data: { awayMessage: message, awaySince: message ? new Date() : null },
  });
  return NextResponse.json({ away: message }, { headers: { 'Cache-Control': 'no-store' } });
}
