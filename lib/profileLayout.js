/**
 * Profile layout: which boxes go in which column, in what order, and which are hidden.
 * Stored on User.profileLayout as { left: [...ids], right: [...ids], hidden: [...ids] }.
 * No database code here, so the Layout editor can use it in the browser too.
 */
export const BOXES = [
  { id: 'profile', label: 'Profile card', note: 'picture, name, mood', emoji: '🪪', lock: true },
  { id: 'links', label: 'My Links', note: 'creators only', emoji: '🔗' },
  { id: 'song', label: 'Profile song', emoji: '🎵' },
  { id: 'video', label: 'Profile video', emoji: '▶️' },
  { id: 'contact', label: 'Contact box', note: 'message, add, report', emoji: '✉️', lock: true },
  { id: 'share', label: 'Share my profile', note: 'only you see it', emoji: '📣' },
  { id: 'url', label: 'My URL', emoji: '🌐' },
  { id: 'groups', label: 'Groups', emoji: '👥' },
  { id: 'interests', label: 'Interests', emoji: '⭐' },
  { id: 'stamps', label: 'Stamp collection', emoji: '🎟️' },
  { id: 'posts', label: 'Latest posts', note: 'creators only', emoji: '📝' },
  { id: 'blog', label: 'Blog entries', emoji: '✍️' },
  { id: 'blurbs', label: 'About me (Blurbs)', emoji: '💬' },
  { id: 'top8', label: 'Top 8 (Friend Space)', emoji: '👯' },
  { id: 'comments', label: 'Friends comments', emoji: '🗨️' },
];

export const DEFAULT_LAYOUT = {
  left: ['profile', 'links', 'song', 'video', 'contact', 'share', 'url', 'groups', 'interests'],
  right: ['stamps', 'posts', 'blog', 'blurbs', 'top8', 'comments'],
  hidden: [],
};

const IDS = new Set(BOXES.map((b) => b.id));
const LOCKED = new Set(BOXES.filter((b) => b.lock).map((b) => b.id));
export const boxInfo = (id) => BOXES.find((b) => b.id === id);

/**
 * Cleans any saved layout: every box appears exactly once, unknown ids are dropped,
 * boxes added to the site later land where the default puts them, and the profile card
 * and contact box (with Report / Block) can never be hidden.
 */
export function normalizeLayout(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const seen = new Set();
  const take = (list) =>
    (Array.isArray(list) ? list : []).filter((id) => typeof id === 'string' && IDS.has(id) && !seen.has(id) && seen.add(id));
  const left = take(src.left);
  const right = take(src.right);
  for (const col of ['left', 'right']) {
    for (const id of DEFAULT_LAYOUT[col]) {
      if (seen.has(id)) continue;
      seen.add(id);
      // Put a missing box after the box it follows in the default layout, if that box is in the same column.
      const target = col === 'left' ? left : right;
      const prev = DEFAULT_LAYOUT[col][DEFAULT_LAYOUT[col].indexOf(id) - 1];
      const at = prev ? target.indexOf(prev) : -1;
      target.splice(at >= 0 ? at + 1 : target.length, 0, id);
    }
  }
  const hidden = [...new Set(Array.isArray(src.hidden) ? src.hidden : [])].filter((id) => IDS.has(id) && !LOCKED.has(id));
  return { left, right, hidden };
}

export function isDefaultLayout(layout) {
  const l = normalizeLayout(layout);
  return JSON.stringify(l) === JSON.stringify(DEFAULT_LAYOUT);
}
