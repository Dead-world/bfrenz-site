/**
 * Stamps: little collectible badges members give each other.
 * tier: free (anyone) · seasonal (anyone, during its dates) · rare (Supporters) · shop (buy once, give forever; Supporters too)
 * Pictures live in public/stamps/<slug>.svg. Never change a slug once people have it.
 */
export const STAMPS = [
  { slug: 'day-one-fren', name: 'Day One Fren', emoji: '🤝', tier: 'free', color: '#ff7a1a', blurb: 'For the ones who were there from the start.' },
  { slug: 'night-owl', name: 'Night Owl', emoji: '🦉', tier: 'free', color: '#6b5bff', blurb: 'Always online at 3am.' },
  { slug: 'music-lover', name: 'Music Lover', emoji: '🎧', tier: 'free', color: '#18c3a4', blurb: 'Best profile songs on the site.' },
  { slug: 'good-vibes', name: 'Good Vibes', emoji: '✌️', tier: 'free', color: '#4fc3ff', blurb: 'Nothing but positive energy.' },
  { slug: 'funniest', name: 'Funniest', emoji: '😂', tier: 'free', color: '#ffb800', blurb: 'Makes everyone laugh.' },
  { slug: 'kind-heart', name: 'Kind Heart', emoji: '💖', tier: 'free', color: '#ff4fd8', blurb: 'Sweetest person you know.' },
  { slug: 'real-one', name: 'Real One', emoji: '💯', tier: 'free', color: '#ff2e63', blurb: 'Always keeps it real.' },
  { slug: 'creative', name: 'Creative', emoji: '🎨', tier: 'free', color: '#b24bff', blurb: 'Their page is a work of art.' },

  { slug: 'spooky-szn', name: 'Spooky Szn', emoji: '🎃', tier: 'seasonal', color: '#ff7a1a', blurb: 'Halloween only.', from: '10-01', to: '11-02' },
  { slug: 'holiday-cheer', name: 'Holiday Cheer', emoji: '☃️', tier: 'seasonal', color: '#4fc3ff', blurb: 'December only.', from: '12-01', to: '01-02' },
  { slug: 'valentine', name: 'Valentine', emoji: '💌', tier: 'seasonal', color: '#ff2e63', blurb: 'February 1 to 15 only.', from: '02-01', to: '02-15' },
  { slug: 'summer-time', name: 'Summer Time', emoji: '🌴', tier: 'seasonal', color: '#18c3a4', blurb: 'June to August only.', from: '06-01', to: '08-31' },

  { slug: 'superstar', name: 'Superstar', emoji: '🌟', tier: 'rare', color: '#ffb800', blurb: 'Supporters only.' },
  { slug: 'royalty', name: 'Royalty', emoji: '👑', tier: 'rare', color: '#b8860b', blurb: 'Supporters only.' },
  { slug: 'iced-out', name: 'Iced Out', emoji: '💎', tier: 'rare', color: '#2a9bd6', blurb: 'Supporters only.' },
  { slug: 'on-fire', name: 'On Fire', emoji: '🔥', tier: 'rare', color: '#ff3d00', blurb: 'Supporters only.' },

  { slug: 'to-the-moon', name: 'To The Moon', emoji: '🚀', tier: 'shop', price: 99, color: '#3d2bff', blurb: 'For someone going places.' },
  { slug: 'one-of-a-kind', name: 'One of a Kind', emoji: '🦄', tier: 'shop', price: 99, color: '#ff4fd8', blurb: 'There is nobody like them.' },
  { slug: 'out-of-this-world', name: 'Out of This World', emoji: '👽', tier: 'shop', price: 99, color: '#22c55e', blurb: 'Simply unreal.' },
  { slug: 'legend', name: 'Legend', emoji: '🐉', tier: 'shop', price: 99, color: '#c2003b', blurb: 'The highest honor.' },
];

export const TIER_LABEL = { free: 'Free', seasonal: 'Seasonal', rare: 'Supporter', shop: 'Shop' };
export const GIVES_PER_DAY = 10;
export const NOTE_MAX = 100;

const BY_SLUG = Object.fromEntries(STAMPS.map((s) => [s.slug, s]));
export function getStamp(slug) {
  return BY_SLUG[String(slug || '')] || null;
}

/** "MM-DD" today in Eastern time. */
function todayMD(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return `${p.find((x) => x.type === 'month').value}-${p.find((x) => x.type === 'day').value}`;
}

/** Is a seasonal stamp giveable right now? (Ranges can wrap past New Year.) */
export function inSeason(stamp, now = new Date()) {
  if (stamp.tier !== 'seasonal') return true;
  const t = todayMD(now);
  return stamp.from <= stamp.to ? t >= stamp.from && t <= stamp.to : t >= stamp.from || t <= stamp.to;
}

/**
 * Can this member give this stamp? `owned` = Set of shop stamp slugs they bought.
 * Returns { ok: true } or { ok: false, why }.
 */
export function canGive(stamp, { supporter, owned }) {
  if (!stamp) return { ok: false, why: 'That stamp does not exist.' };
  if (stamp.tier === 'seasonal' && !inSeason(stamp)) return { ok: false, why: `${stamp.name} is only around ${stamp.blurb.replace(/ only\.$/, '').toLowerCase()}.` };
  if (stamp.tier === 'rare' && !supporter) return { ok: false, why: 'Rare stamps are for Supporters.' };
  if (stamp.tier === 'shop' && !supporter && !owned.has(stamp.slug)) return { ok: false, why: 'Get this stamp in the shop first.' };
  return { ok: true };
}
