/**
 * "Design my profile": simple color / font / corner choices that become CSS for the member's
 * profile page. Applied after their theme (so it tweaks the theme) and before their own custom CSS.
 * Every value is checked against a fixed format or list, so nothing unsafe reaches the page.
 * (No database imports: safe anywhere.)
 */
export const FONTS = [
  ['', 'Theme default'],
  ['arial', 'Clean (Arial)'],
  ['verdana', 'Classic web (Verdana)'],
  ['georgia', 'Elegant (Georgia)'],
  ['times', 'Old school (Times)'],
  ['courier', 'Typewriter (Courier)'],
  ['comic', 'Fun (Comic Sans)'],
  ['impact', 'Loud (Impact)'],
  ['trebuchet', 'Friendly (Trebuchet)'],
];
const FONT_STACKS = {
  arial: 'Arial, Helvetica, sans-serif',
  verdana: 'Verdana, Geneva, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  times: '"Times New Roman", Times, serif',
  courier: '"Courier New", Courier, monospace',
  comic: '"Comic Sans MS", "Comic Neue", "Chalkboard SE", cursive',
  impact: 'Impact, "Arial Black", sans-serif',
  trebuchet: '"Trebuchet MS", Tahoma, sans-serif',
};
export const CORNERS = [
  ['', 'Theme default'],
  ['square', 'Square'],
  ['round', 'Rounded'],
  ['bubbly', 'Extra round'],
];
const RADIUS = { square: [0, 0], round: [14, 10], bubbly: [28, 18] };

/** Ready-made color sets to start from. */
export const PRESETS = [
  { name: 'Midnight', bg: '#0b0b1a', bg2: '#1b1240', box: '#151532', boxAlpha: 85, text: '#eef0ff', accent: '#8b7bff', border: '#3a3470' },
  { name: 'Bubblegum', bg: '#ffd6ec', bg2: '#ffb3d9', box: '#ffffff', boxAlpha: 80, text: '#4a1036', accent: '#ff3d9a', border: '#ff9cc9' },
  { name: 'Forest', bg: '#0f2416', bg2: '#1c3b22', box: '#14301c', boxAlpha: 85, text: '#e8f5e9', accent: '#7ddc6a', border: '#2f5b37' },
  { name: 'Sunset', bg: '#2b0f2e', bg2: '#ff7a1a', box: '#1f0d22', boxAlpha: 80, text: '#fff1e6', accent: '#ffb347', border: '#6b2b5e' },
  { name: 'Ocean', bg: '#03223a', bg2: '#0a5b7a', box: '#062f4a', boxAlpha: 80, text: '#e6f9ff', accent: '#3fd2ff', border: '#1d5f80' },
  { name: 'Paper', bg: '#f4efe6', bg2: '', box: '#fffdf8', boxAlpha: 100, text: '#2b2621', accent: '#c2410c', border: '#d9cfbf' },
];

const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v) => (HEX.test(String(v || '')) ? String(v).toLowerCase() : '');

/** Keeps only valid values. Returns null when nothing is set (= no design). */
export function cleanDesign(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const out = {
    bg: hex(d.bg),
    bg2: hex(d.bg2),
    box: hex(d.box),
    boxAlpha: Math.min(100, Math.max(20, parseInt(d.boxAlpha, 10) || 85)),
    text: hex(d.text),
    accent: hex(d.accent),
    border: hex(d.border),
    font: FONT_STACKS[d.font] ? d.font : '',
    corners: RADIUS[d.corners] ? d.corners : '',
  };
  const any = out.bg || out.box || out.text || out.accent || out.border || out.font || out.corners;
  return any ? out : null;
}

function rgba(h, alpha) {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.round(alpha * 100) / 100})`;
}

/** The CSS for a design ('' when there's nothing to apply). Only includes what was picked. */
export function designCss(raw) {
  const d = cleanDesign(raw);
  if (!d) return '';
  const vars = [];
  const rules = [];
  if (d.bg) {
    const bg = d.bg2 ? `linear-gradient(160deg, ${d.bg}, ${d.bg2}) fixed` : d.bg;
    rules.push(`html { background: ${d.bg}; }`, `body { background: ${bg}; background-attachment: fixed; }`, 'body::before, body::after { display: none; }');
    vars.push(`--bg: ${d.bg}`);
  }
  if (d.box) {
    vars.push(`--surface: ${rgba(d.box, d.boxAlpha / 100)}`, `--surface-2: ${rgba(d.box, Math.min(1, d.boxAlpha / 100 + 0.08))}`, `--surface-3: ${rgba(d.box, Math.min(1, d.boxAlpha / 100 + 0.16))}`);
    rules.push(`.profile-page .box { background: ${rgba(d.box, d.boxAlpha / 100)}; }`);
  }
  if (d.text) {
    vars.push(`--text: ${d.text}`, `--text-dim: ${rgba(d.text, 0.7)}`);
    rules.push(`.profile-page, .profile-page .box, .profile-page .box-b, .profile-page p, .profile-page li, .profile-page td { color: ${d.text}; }`);
  }
  if (d.accent) {
    vars.push(`--orange: ${d.accent}`, `--orange-hot: ${d.accent}`, `--orange-soft: ${rgba(d.accent, 0.14)}`);
    rules.push(`.profile-page a { color: ${d.accent}; }`, `.profile-page .box-h { color: ${d.accent}; }`, `.profile-page .box-h::before { background: ${d.accent}; }`);
  }
  if (d.border) {
    vars.push(`--line: ${d.border}`);
    rules.push(`.profile-page .box { border-color: ${d.border}; }`, `.profile-page .box-h { border-bottom-color: ${d.border}; }`);
  }
  if (d.font) rules.push(`.profile-page, .profile-page .box-h, .profile-name, .profile-page button, .profile-page input, .profile-page textarea { font-family: ${FONT_STACKS[d.font]}; }`);
  if (d.corners) {
    const [r, rs] = RADIUS[d.corners];
    vars.push(`--radius: ${r}px`, `--radius-sm: ${rs}px`);
    rules.push(`.profile-page .box { border-radius: ${r}px; }`);
  }
  return `/* Design my profile */\n${vars.length ? `:root { ${vars.join('; ')}; }\n` : ''}${rules.join('\n')}\n`;
}
