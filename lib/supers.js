/**
 * Super Comments / Super Chats: pay coins to highlight a comment and pin it to the top.
 * (No database imports: safe anywhere.)
 */
export const SUPER_TIERS = [
  { tier: 1, coins: 50, emoji: '⭐', name: 'Super', hours: 1, liveSecs: 60, color: '#3b82f6' },
  { tier: 2, coins: 150, emoji: '🌟', name: 'Mega', hours: 12, liveSecs: 180, color: '#a855f7' },
  { tier: 3, coins: 500, emoji: '💫', name: 'Ultra', hours: 48, liveSecs: 600, color: '#f59e0b' },
];

export function getTier(n) {
  return SUPER_TIERS.find((t) => t.tier === Number(n)) || null;
}

/** The tier a paid amount belongs to (for showing a saved Super Comment). */
export function tierFor(coins) {
  return [...SUPER_TIERS].reverse().find((t) => coins >= t.coins) || null;
}

/** Is this Super Comment still pinned? */
export function isPinned(c, now = Date.now()) {
  return !!c?.superUntil && new Date(c.superUntil).getTime() > now;
}
