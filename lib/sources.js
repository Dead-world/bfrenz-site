/** Answers for "How did you hear about BFRENZ?" (key, label). */
export const HEARD_FROM = [
  ['tiktok', 'TikTok'],
  ['instagram', 'Instagram'],
  ['facebook', 'Facebook'],
  ['youtube', 'YouTube'],
  ['x', 'X / Twitter'],
  ['reddit', 'Reddit'],
  ['snapchat', 'Snapchat'],
  ['discord', 'Discord'],
  ['friend', 'A friend told me'],
  ['artist', 'An artist or DJ I follow'],
  ['google', 'Google search'],
  ['flyer', 'A flyer or QR code'],
  ['producthunt', 'Product Hunt'],
  ['other', 'Somewhere else'],
];

export function heardLabel(key) {
  return HEARD_FROM.find(([k]) => k === key)?.[1] || (key ? key : 'Not answered');
}

/** Cleans a ?src= tag from a link: letters, numbers, - and _ only. */
export function cleanSrc(v) {
  const s = String(v || '').toLowerCase().trim();
  return /^[a-z0-9_-]{1,30}$/.test(s) ? s : '';
}
