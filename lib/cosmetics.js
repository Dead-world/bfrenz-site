/**
 * Profile extras: picture frames, cursor trails and falling effects.
 * coins: 0 = free for everyone; otherwise bought once with BFRENZ coins and kept forever.
 * (No database imports: safe anywhere.)
 */
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
];

export const CURSORS = [
  { slug: 'sparkle', name: 'Sparkles', emoji: '✨', coins: 0 },
  { slug: 'stars', name: 'Stars', emoji: '⭐', coins: 100 },
  { slug: 'hearts', name: 'Hearts', emoji: '💖', coins: 150 },
  { slug: 'fire', name: 'Fire', emoji: '🔥', coins: 150 },
  { slug: 'bubbles', name: 'Bubbles', emoji: '🫧', coins: 150 },
  { slug: 'music', name: 'Music', emoji: '🎵', coins: 200 },
  { slug: 'money', name: 'Money', emoji: '💸', coins: 250 },
];

export const FALLS = [
  { slug: 'snow', name: 'Snow', emoji: '❄️', coins: 0 },
  { slug: 'hearts', name: 'Hearts', emoji: '💖', coins: 150 },
  { slug: 'stars', name: 'Stars', emoji: '⭐', coins: 150 },
  { slug: 'sakura', name: 'Cherry Blossoms', emoji: '🌸', coins: 200 },
  { slug: 'leaves', name: 'Fall Leaves', emoji: '🍂', coins: 200 },
  { slug: 'confetti', name: 'Confetti', emoji: '🎉', coins: 250 },
  { slug: 'money', name: 'Make It Rain', emoji: '💸', coins: 300 },
];

export const COSMETIC_KINDS = {
  frame: { list: FRAMES, field: 'picFrame', label: 'Picture frame' },
  cursor: { list: CURSORS, field: 'cursorFx', label: 'Cursor trail' },
  fall: { list: FALLS, field: 'fallFx', label: 'Falling effect' },
};

export function getCosmetic(kind, slug) {
  return COSMETIC_KINDS[kind]?.list.find((c) => c.slug === slug) || null;
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
