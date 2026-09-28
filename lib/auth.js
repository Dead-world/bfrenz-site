import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './db';

const COOKIE = 'bfrenz_session';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET is missing or shorter than 32 characters.');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;

/** The logged-in user, or null. Cached for the length of one request. */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  let uid;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    uid = payload.uid;
  } catch {
    return null;
  }
  if (typeof uid !== 'string') return null;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return null;

  // Keep "Online Now!" fresh without writing on every single request.
  if (!user.lastSeen || Date.now() - user.lastSeen.getTime() > 2 * 60 * 1000) {
    await prisma.user
      .update({ where: { id: user.id }, data: { lastSeen: new Date() } })
      .catch(() => {});
  }
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
