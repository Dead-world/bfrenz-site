/**
 * Where to draw a pop-up menu next to a button so it's never cut off: below the button if
 * there's room, otherwise above it, lined up with the button's right (or left) edge.
 * Returns a style for a position: fixed element.
 */
export function popPos(button, { height = 320, align = 'right', width = 0 } = {}) {
  const r = button.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const style = { position: 'fixed' };
  if (vh - r.bottom > height + 12 || r.top < height + 12) style.top = Math.round(r.bottom + 6);
  else style.bottom = Math.round(vh - r.top + 6);
  // Keep the whole menu on screen: if lining up with the button would push it off an edge, slide it in.
  if (align === 'right' && (!width || r.right - width >= 8)) style.right = Math.max(8, Math.round(vw - r.right));
  else style.left = Math.max(8, Math.min(Math.round(r.left), vw - (width || 268) - 8));
  return style;
}
