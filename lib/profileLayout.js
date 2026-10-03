/**
 * Profile layout: which boxes go in which column, in what order, and which are hidden.
 * Stored on User.profileLayout as { left: [...ids], right: [...ids], hidden: [...ids] }.
 * No database code here, so the Layout editor can use it in the browser too.
 */
export const BOXES = [
  { id: 'profile', label: 'Profile card', note: 'picture, name, mood', emoji: '🪪', lock: true },
  { id: 'links', label: 'My Links', note: 'creators only', emoji: '🔗' },
  { id: 'support', label: 'Support me', note: 'tip buttons', emoji: '💸' },
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
  left: ['profile', 'links', 'support', 'song', 'video', 'contact', 'share', 'url', 'groups', 'interests'],
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

/**
 * Some themes (Miami Nights, Money Talks…) place boxes on a fixed grid. When a member saves
 * their own layout, this CSS goes after the theme so their order wins. The theme's colors,
 * fonts and effects stay; only the box positions go back to two columns.
 */
export const CUSTOM_LAYOUT_CSS = `
.profile-page.custom-layout .cols { display: flex !important; grid-template-areas: none !important; grid-template-columns: none !important; grid-template-rows: none !important; gap: 20px; }
.profile-page.custom-layout .col-left, .profile-page.custom-layout .col-right { display: flex !important; flex-direction: column; gap: 18px; min-width: 0; }
.profile-page.custom-layout .col-left { width: 330px; flex-shrink: 0; }
.profile-page.custom-layout .col-right { flex: 1; }
.profile-page.custom-layout .col-left > *, .profile-page.custom-layout .col-right > * { grid-area: auto !important; margin: 0 !important; }
.profile-page.custom-layout .col-left .profile-card .box-b { grid-template-columns: 1fr !important; text-align: center; justify-items: center; }
.profile-page.custom-layout .col-left .profile-card .profile-name,
.profile-page.custom-layout .col-left .profile-card .profile-facts,
.profile-page.custom-layout .col-left .profile-card .mood,
.profile-page.custom-layout .col-left .profile-card .small { grid-column: 1 !important; grid-row: auto !important; }
.profile-page.custom-layout .col-left .profile-card .profile-head .pic { order: -1; grid-column: 1 !important; grid-row: auto !important; width: 140px; height: 140px; margin-bottom: 14px; }
.profile-page.custom-layout .col-left .profile-card .profile-name { font-size: 36px; }
.profile-page.custom-layout .col-left .profile-card .profile-facts { justify-content: center; }
@media (max-width: 860px) {
  .profile-page.custom-layout .cols { flex-direction: column; }
  .profile-page.custom-layout .col-left { width: 100%; }
  .profile-page.custom-layout .col-right { width: 100%; }
}
`;

/** Does this theme's CSS place boxes on its own fixed grid? */
export function themeHasOwnLayout(css) {
  return /grid-template-areas/.test(String(css || ''));
}
