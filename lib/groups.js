import { prisma } from './db';
import { isAdmin } from './moderation';

export const GROUP_CATEGORIES = [
  'Music', 'Hip Hop', 'Rock & Punk', 'Pop', 'R&B', 'Country', 'Electronic & DJs', 'Local Scene',
  'Fan Club', 'Gaming', 'Movies & TV', 'Anime', 'Art & Design', 'Fashion', 'Sports', 'School',
  'City & Hometown', 'Nostalgia', 'Memes & Fun', 'Support', 'Other',
];

export const GROUP_NAME_MAX = 60;
export const GROUP_DESC_MAX = 2000;
export const GROUP_POST_MAX = 3000;
export const GROUP_REPLY_MAX = 1000;
export const GROUPS_PER_OWNER = 5;

const RESERVED = new Set(['new', 'edit', 'create', 'search', 'admin', 'settings']);

export function slugify(name) {
  const base = String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return base || 'group';
}

/** A free slug based on the name: "pop-punk", "pop-punk-2", ... */
export async function freeSlug(name) {
  const base = slugify(name);
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (RESERVED.has(slug)) continue;
    const taken = await prisma.group.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function getGroup(slug) {
  return prisma.group.findUnique({
    where: { slug: String(slug || '').toLowerCase() },
    include: { owner: { select: { id: true, username: true, displayName: true, bannedAt: true } } },
  });
}

/** The viewer's membership row in a group (or null). */
export async function membershipOf(groupId, userId) {
  if (!userId) return null;
  return prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
}

export const isMember = (m) => !!m && m.role !== 'banned';
export const isGroupMod = (m) => !!m && (m.role === 'owner' || m.role === 'mod');

/** Owner/mods of the group, or a site admin. */
export function canModerate(me, member) {
  return isGroupMod(member) || isAdmin(me);
}
