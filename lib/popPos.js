/**
 * Where to draw a pop-up menu next to a button so it's never cut off: below the button if
 * there's room, otherwise above it, lined up with the button's right (or left) edge.
 * Returns a style for a position: fixed element.
 */
export function popPos(button, { height = 320, align = 'right' } = {}) {
  const r = button.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const style = { position: 'fixed' };
  if (vh - r.bottom > height + 12 || r.top < height + 12) style.top = Math.round(r.bottom + 6);
  else style.bottom = Math.round(vh - r.top + 6);
  if (align === 'right') style.right = Math.max(8, Math.round(vw - r.right));
  else style.left = Math.max(8, Math.min(Math.round(r.left), vw - 268));
  return style;
}
