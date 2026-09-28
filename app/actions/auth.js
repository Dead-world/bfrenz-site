'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { str, validateUsername, withParam } from '@/lib/util';

function fail(path, msg) {
  redirect(withParam(path, 'error', msg));
}

export async function signup(formData) {
  const username = str(formData, 'username', 40).toLowerCase();
  const email = str(formData, 'email', 200).toLowerCase();
  const displayName = str(formData, 'displayName', 40) || username;
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');

  const nameError = validateUsername(username);
  if (nameError) fail('/signup', nameError);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('/signup', 'Please enter a real email address.');
  if (password.length < 8) fail('/signup', 'Passwords need at least 8 characters.');
  if (password !== confirm) fail('/signup', "Those passwords don't match.");

  const taken = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true },
  });
  if (taken) {
    fail('/signup', taken.username === username ? 'That username is taken.' : 'That email already has an account.');
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        username,
        email,
        displayName,
        passwordHash: await bcrypt.hash(password, 10),
        headline: 'new to bfrenz!',
      },
    });
  } catch (e) {
    if (e?.code === 'P2002') fail('/signup', 'That username or email was just taken. Try another.');
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

  await createSession(user.id);
  redirect('/edit?welcome=1');
}

export async function login(formData) {
  const who = str(formData, 'who', 200).toLowerCase();
  const password = String(formData.get('password') || '');
  if (!who || !password) fail('/login', 'Enter your email or username and password.');

  const user = await prisma.user.findFirst({ where: { OR: [{ email: who }, { username: who }] } });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) fail('/login', 'Wrong email/username or password.');

  await createSession(user.id);
  redirect('/home');
}
