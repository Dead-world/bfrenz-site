import { prisma } from './db';
import { getTheme } from './themes';
import { getAboutTemplate } from './aboutTemplates';

/** Paid Supporter, or free Supporter time earned from invites. */
export function isSupporter(user) {
  const now = new Date();
  return (
    !!user?.lifetimeSupporter ||
    (!!user?.supporterUntil && new Date(user.supporterUntil) > now) ||
    (!!user?.bonusSupporterUntil && new Date(user.bonusSupporterUntil) > now)
  );
}

export function isFeatured(user) {
  return !!user?.featuredUntil && new Date(user.featuredUntil) > new Date();
}

/** Supporters get a Top 16. */
export function topFriendLimit(user) {
  return isSupporter(user) ? 16 : 8;
}

export async function ownedThemeSlugs(userId) {
  const rows = await prisma.purchase.findMany({
    where: { userId, kind: 'theme' },
    select: { itemId: true },
  });
  return new Set(rows.map((r) => r.itemId));
}

/** Free themes, Supporters (all themes included) and buyers can use a theme. */
export async function canUseTheme(user, slug) {
  const theme = getTheme(slug);
  if (!theme) return false;
  if (theme.price === 0 || isSupporter(user)) return true;
  return (await ownedThemeSlugs(user.id)).has(slug);
}

/** Only allow simple hex colors for the Supporter name color. */
export function cleanColor(value) {
  const s = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : '';
}

export async function ownedAboutSlugs(userId) {
  const rows = await prisma.purchase.findMany({
    where: { userId, kind: 'about' },
    select: { itemId: true },
  });
  return new Set(rows.map((r) => r.itemId));
}

/** Free templates, Supporters (all included) and buyers can use an About Me template. */
export async function canUseAboutTemplate(user, slug) {
  const t = getAboutTemplate(slug);
  if (!t) return false;
  if (t.price === 0 || isSupporter(user)) return true;
  return (await ownedAboutSlugs(user.id)).has(slug);
}
