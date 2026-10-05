import { prisma } from './db';
import { validateUsername } from './util';
import { isAdmin } from './moderation';

/** Why this member can't switch to this username (null = fine). */
export async function usernameProblem(me, raw) {
  const name = String(raw || '').trim().replace(/^@/, '').toLowerCase();
  const bad = validateUsername(name);
  if (bad) return bad;
  if (name === me.username) return 'That’s already your username.';
  // Admin powers are tied to the username set in Vercel, so admins change it there first.
  if (isAdmin(me)) return 'Admin accounts can’t change usernames here (admin access is tied to your username in Vercel).';
  const [taken, used] = await Promise.all([
    prisma.user.findUnique({ where: { username: name }, select: { id: true } }),
    prisma.usernameHistory.findUnique({ where: { old: name }, select: { userId: true } }),
  ]);
  if (taken) return 'That username is taken. Try another.';
  // Someone else's old name stays theirs, so their old links keep working.
  if (used && used.userId !== me.id) return 'That username is taken. Try another.';
  return null;
}

/**
 * Switches the username. The old one is saved so links and @mentions to it redirect.
 * Throws if the name can't be used (checked again here, in case it was taken meanwhile).
 */
export async function applyUsername(user, raw, { paid = false } = {}) {
  const name = String(raw || '').trim().replace(/^@/, '').toLowerCase();
  const problem = await usernameProblem(user, name);
  if (problem) throw new Error(problem);
  await prisma.$transaction([
    // Taking back one of your own old names: it isn't "old" anymore.
    prisma.usernameHistory.deleteMany({ where: { old: name, userId: user.id } }),
    prisma.usernameHistory.upsert({ where: { old: user.username }, create: { old: user.username, userId: user.id }, update: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { username: name, usernameChanges: { increment: 1 } } }),
  ]);
  return { name, paid };
}

/** The current username for an old one (null if it was never anyone's old name). */
export async function renamedTo(old) {
  const h = await prisma.usernameHistory.findUnique({ where: { old: String(old || '').toLowerCase() }, include: { user: { select: { username: true } } } });
  return h?.user?.username || null;
}
