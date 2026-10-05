/**
 * Profile extras: picture frames, cursor trails and falling effects.
 * coins: 0 = free for everyone; otherwise bought once with BFRENZ coins and kept forever.
 * (No database imports: safe anywhere.)
 */
/** Seasonal items: on sale until the end date; anyone who bought one keeps it forever. */
export const HALLOWEEN = { name: '🎃 Halloween', until: '2026-11-01T04:00:00Z' }; // midnight Oct 31, Eastern

export const FRAMES = [
  { slug: 'glow', name: 'Orange Glow', coins: 0 },
  { slug: 'silver', name: 'Silver', coins: 0 },
  { slug: 'gold', name: 'Gold', coins: 150 },
  { slug: 'love', name: 'Love Pulse', coins: 150 },
  { slug: 'ice', name: 'Ice', coins: 200 },
  { slug: 'neon', name: 'Neon', coins: 250 },
  { slug: 'toxic', name: 'Toxic', coins: 250 },
  { slug: 'fire', name: 'Fire', coins: 300 },
  { slug: 'galaxy', name: 'Galaxy', coins: 300 },
  { slug: 'rainbow', name: 'Rainbow', coins: 400 },
  { slug: 'pumpkin', name: 'Pumpkin Glow', coins: 200, season: HALLOWEEN },
  { slug: 'witch', name: 'Witchy', coins: 250, season: HALLOWEEN },
  { slug: 'ghost', name: 'Ghostly', coins: 250, season: HALLOWEEN },
  { slug: 'blood', name: 'Blood Moon', coins: 300, season: HALLOWEEN },
];

export const CURSORS = [
  { slug: 'sparkle', name: 'Sparkles', emoji: '✨', coins: 0 },
  { slug: 'stars', name: 'Stars', emoji: '⭐', coins: 100 },
  { slug: 'hearts', name: 'Hearts', emoji: '💖', coins: 150 },
  { slug: 'fire', name: 'Fire', emoji: '🔥', coins: 150 },
  { slug: 'bubbles', name: 'Bubbles', emoji: '🫧', coins: 150 },
  { slug: 'music', name: 'Music', emoji: '🎵', coins: 200 },
  { slug: 'money', name: 'Money', emoji: '💸', coins: 250 },
  { slug: 'ghosts', name: 'Ghosts', emoji: '👻', coins: 150, season: HALLOWEEN },
  { slug: 'spiders', name: 'Spiders', emoji: '🕷️', coins: 150, season: HALLOWEEN },
  { slug: 'bats', name: 'Bats', emoji: '🦇', coins: 200, season: HALLOWEEN },
];

export const FALLS = [
  { slug: 'snow', name: 'Snow', emoji: '❄️', coins: 0 },
  { slug: 'hearts', name: 'Hearts', emoji: '💖', coins: 150 },
  { slug: 'stars', name: 'Stars', emoji: '⭐', coins: 150 },
  { slug: 'sakura', name: 'Cherry Blossoms', emoji: '🌸', coins: 200 },
  { slug: 'leaves', name: 'Fall Leaves', emoji: '🍂', coins: 200 },
  { slug: 'confetti', name: 'Confetti', emoji: '🎉', coins: 250 },
  { slug: 'money', name: 'Make It Rain', emoji: '💸', coins: 300 },
  { slug: 'bats', name: 'Bats', emoji: '🦇', coins: 200, season: HALLOWEEN },
  { slug: 'pumpkins', name: 'Pumpkins', emoji: '🎃', coins: 200, season: HALLOWEEN },
  { slug: 'ghosts', name: 'Ghosts', emoji: '👻', coins: 250, season: HALLOWEEN },
  { slug: 'candy', name: 'Candy Rain', emoji: '🍬', coins: 250, season: HALLOWEEN },
];

export const COSMETIC_KINDS = {
  frame: { list: FRAMES, field: 'picFrame', label: 'Picture frame' },
  cursor: { list: CURSORS, field: 'cursorFx', label: 'Cursor trail' },
  fall: { list: FALLS, field: 'fallFx', label: 'Falling effect' },
};

export function getCosmetic(kind, slug) {
  return COSMETIC_KINDS[kind]?.list.find((c) => c.slug === slug) || null;
}

/** Can it still be bought? (Seasonal items stop selling after their end date.) */
export function onSale(c, now = Date.now()) {
  return !!c && (!c.season || now < Date.parse(c.season.until));
}

/** What to show in the shop: everything on sale, plus anything already owned. */
export function visibleList(user, kind, now = Date.now()) {
  return (COSMETIC_KINDS[kind]?.list || []).filter((c) => onSale(c, now) || ownsCosmetic(user, kind, c.slug));
}

/** Free, or already bought. */
export function ownsCosmetic(user, kind, slug) {
  const c = getCosmetic(kind, slug);
  if (!c) return false;
  return c.coins === 0 || (user?.cosmetics || []).includes(`${kind}:${slug}`);
}

/** Emoji for a cursor trail or falling effect (null if unknown). */
export function fxEmoji(kind, slug) {
  return getCosmetic(kind, slug)?.emoji || null;
}
