import { isSupporter } from './perks';

/**
 * Name effects: an animated look for a member's name everywhere it shows
 * (comments, Top 8, Feed, profile). Buy one for PRICES.nameEffect, or get them all with Supporter.
 * cls = the CSS classes that draw it (see "name effects" in globals.css).
 */
export const NAME_EFFECTS = [
  { slug: 'pink-glitter', name: 'Pink Glitter', cls: 'glitter g-pink' },
  { slug: 'gold-glitter', name: 'Gold Glitter', cls: 'glitter g-gold' },
  { slug: 'rainbow', name: 'Rainbow', cls: 'glitter g-rainbow' },
  { slug: 'fire', name: 'Fire', cls: 'glitter g-fire' },
  { slug: 'ice', name: 'Ice', cls: 'glitter g-ice' },
  { slug: 'toxic', name: 'Toxic', cls: 'glitter g-toxic' },
  { slug: 'purple-haze', name: 'Purple Haze', cls: 'glitter g-purple' },
  { slug: 'neon', name: 'Neon Sign', cls: 'name-neon' },
];

const BY_SLUG = Object.fromEntries(NAME_EFFECTS.map((e) => [e.slug, e]));
export function getNameEffect(slug) {
  return BY_SLUG[String(slug || '')] || null;
}

/** Can this member use this effect? (bought it, or Supporter) */
export function ownsNameEffect(user, slug) {
  if (!user || !getNameEffect(slug)) return false;
  return isSupporter(user) || (user.nameEffectsOwned || []).includes(slug);
}

/** The effect to draw on this member's name right now, or null. */
export function activeNameEffect(user) {
  const fx = getNameEffect(user?.nameEffect);
  return fx && ownsNameEffect(user, fx.slug) ? fx : null;
}
