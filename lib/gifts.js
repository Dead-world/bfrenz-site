/**
 * Virtual gifts, bought with BFRENZ coins. (No database imports: safe anywhere.)
 * Gifts are a thank-you: they don't turn into cash for the person who gets them.
 */
export const GIFTS = [
  { slug: 'rose', emoji: '🌹', name: 'Rose', coins: 10 },
  { slug: 'fire', emoji: '🔥', name: 'Fire', coins: 25 },
  { slug: 'heart', emoji: '💖', name: 'Big Love', coins: 50 },
  { slug: 'trophy', emoji: '🏆', name: 'Trophy', coins: 100 },
  { slug: 'crown', emoji: '👑', name: 'Crown', coins: 250 },
  { slug: 'diamond', emoji: '💎', name: 'Diamond', coins: 500 },
  { slug: 'rocket', emoji: '🚀', name: 'Rocket', coins: 1000 },
];

export function getGift(slug) {
  return GIFTS.find((g) => g.slug === slug) || null;
}
