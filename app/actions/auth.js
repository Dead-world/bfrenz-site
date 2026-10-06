'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { safeBack, str, validateUsername, withParam } from '@/lib/util';
import { cookies } from 'next/headers';
import { HEARD_FROM, cleanSrc } from '@/lib/sources';
import { after } from 'next/server';
import { welcomeNewMember } from '@/lib/houseBot';
import { WELCOME_COINS } from '@/lib/invites';

function fail(path, msg) {
  redirect(withParam(path, 'error', msg));
}

export async function signup(formData) {
  const username = str(formData, 'username', 40).toLowerCase();
  const email = str(formData, 'email', 200).toLowerCase();
  const displayName = str(formData, 'displayName', 40) || username;
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');
  const ref = str(formData, 'ref', 40).toLowerCase().replace(/[^a-z0-9_]/g, '');
  const back = ref ? `/signup?ref=${ref}` : '/signup';

  const nameError = validateUsername(username);
  if (nameError) fail(back, nameError);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(back, 'Please enter a real email address.');
  if (password.length < 8) fail(back, 'Passwords need at least 8 characters.');
  if (password !== confirm) fail(back, "Those passwords don't match.");

  const taken = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true },
  });
  if (taken) {
    fail(back, taken.username === username ? 'That username is taken.' : 'That email already has an account.');
  }

  // Who invited them (bfrenz.com/signup?ref=username).
  const referrer = ref
    ? await prisma.user.findFirst({ where: { username: ref, bannedAt: null }, select: { id: true } })
    : null;

  let user;
  try {
    user = await prisma.user.create({
      data: {
        username,
        email,
        displayName,
        passwordHash: await bcrypt.hash(password, 10),
        headline: 'new to bfrenz!',
        referredById: referrer?.id || null,
        // Joined with a fren's invite link: welcome coins right away.
        coins: referrer ? WELCOME_COINS : 0,
        heardFrom: HEARD_FROM.some(([k]) => k === str(formData, 'heardFrom', 20)) ? str(formData, 'heardFrom', 20) : '',
        signupSrc: cleanSrc((await cookies()).get('bfrenz_src')?.value),
      },
    });
  } catch (e) {
    if (e?.code === 'P2002') fail(back, 'That username or email was just taken. Try another.');
    throw e;
  }

  // Everyone's first friend: the site founder.
  const founderName = (process.env.FOUNDER_USERNAME || '').toLowerCase();
  if (founderName && founderName !== username) {
    const founder = await prisma.user.findUnique({ where: { username: founderName } });
    if (founder) {
      await prisma.friendship.create({
        data: { requesterId: founder.id, addresseeId: user.id, status: 'ACCEPTED' },
      });
    }
  }

  // ...and the friend who invited them.
  if (referrer) {
    await prisma.friendship
      .create({ data: { requesterId: referrer.id, addresseeId: user.id, status: 'ACCEPTED' } })
      .catch(() => {}); // already friends (e.g. the inviter is the founder)
  }

  // BFRENZ Bot says hi on their page (after the response, so sign-up stays fast).
  after(() => welcomeNewMember(user));

  await createSession(user.id);
  redirect('/edit?welcome=1');
}

export async function login(formData) {
  const who = str(formData, 'who', 200).toLowerCase();
  const password = String(formData.get('password') || '');
  // After logging in, go back to the page they were trying to see (e.g. a shared post).
  const next = safeBack(formData.get('next'), '/home');
  const here = next === '/home' ? '/login' : `/login?next=${encodeURIComponent(next)}`;
  if (!who || !password) fail(here, 'Enter your email or username and password.');

  const user = await prisma.user.findFirst({ where: { OR: [{ email: who }, { username: who }] } });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) fail(here, 'Wrong email/username or password.');
  if (user.bannedAt) fail(here, 'This account has been suspended for breaking the BFRENZ Terms.');

  await createSession(user.id, user.sessionVersion ?? 0);
  redirect(next);
}
