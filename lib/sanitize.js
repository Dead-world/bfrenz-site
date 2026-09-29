/**
 * Zero-dependency HTML + CSS sanitizers.
 *
 * cleanHtml rebuilds the output from scratch: every piece of text is escaped,
 * and only tags/attributes on the allowlist are re-emitted with escaped,
 * validated values. Anything not understood is escaped or dropped, so the
 * result can never contain script, event handlers or javascript: links.
 */

const ALLOWED_TAGS = new Set([
  'b', 'i', 'u', 's', 'strong', 'em', 'br', 'p', 'div', 'span', 'center', 'font',
  'img', 'a', 'marquee', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'hr', 'table',
  'tbody', 'thead', 'tr', 'td', 'th', 'blockquote', 'small', 'big', 'sup', 'sub',
]);

const VOID_TAGS = new Set(['br', 'hr', 'img']);

// Tags whose entire contents are thrown away.
const DROP_CONTENT = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'textarea', 'title',
  'xmp', 'template', 'svg', 'math', 'frameset', 'frame', 'noembed', 'noframes', 'plaintext',
]);

const ALLOWED_ATTRS = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'width', 'height', 'title'],
  font: ['color', 'size', 'face'],
  marquee: ['direction', 'behavior', 'scrollamount'],
  table: ['border', 'cellpadding', 'cellspacing', 'width', 'align', 'bgcolor'],
  td: ['colspan', 'rowspan', 'align', 'valign', 'width', 'bgcolor'],
  th: ['colspan', 'rowspan', 'align', 'width', 'bgcolor'],
  div: ['align'],
  p: ['align'],
};
const GLOBAL_ATTRS = ['style'];

const URL_ATTRS = new Set(['href', 'src']);

const SAFE_VALUE = /^[#\w\s.,%()'"-]*$/; // for plain attributes like color/width/align
const STYLE_RULES = {
  color: /^[#a-z0-9(),.\s%]+$/i,
  'background-color': /^[#a-z0-9(),.\s%]+$/i,
  'font-size': /^\d+(\.\d+)?(px|em|pt|%)$/i,
  'font-weight': /^(bold|normal|\d{3})$/i,
  'font-style': /^(italic|normal)$/i,
  'font-family': /^[\w\s,'"-]+$/,
  'text-align': /^(left|right|center|justify)$/i,
  'text-decoration': /^[a-z\s-]+$/i,
};

function escapeText(s) {
  // Keep real entities like &hearts; or &#9829; so people can use them.
  return s
    .replace(/&(?!(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});)/gi, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&(quot|apos|amp|lt|gt|colon|tab|newline);?/gi, (_, n) =>
      ({ quot: '"', apos: "'", amp: '&', lt: '<', gt: '>', colon: ':', tab: '\t', newline: '\n' })[
        n.toLowerCase()
      ]
    );
}

function safeChar(code) {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

function cleanUrlAttr(raw, attr) {
  const v = decodeEntities(raw).replace(/[\u0000- \u007f-\u009f]/g, '');
  const ok = attr === 'href' ? /^(https?:\/\/|mailto:)/i : /^https?:\/\//i;
  return ok.test(v) ? v : null;
}

function cleanStyle(raw) {
  const out = [];
  for (const decl of decodeEntities(raw).split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim();
    const rule = STYLE_RULES[prop];
    if (!rule || !val || val.length > 100) continue;
    if (/url\s*\(|expression|\\|javascript|@/i.test(val)) continue;
    if (rule.test(val)) out.push(`${prop}: ${val}`);
  }
  return out.join('; ');
}

const ATTR_RE = /([a-zA-Z][a-zA-Z0-9-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function buildOpenTag(tag, attrString) {
  const allowed = new Set([...(ALLOWED_ATTRS[tag] || []), ...GLOBAL_ATTRS]);
  const parts = [];
  const seen = new Set();
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(attrString))) {
    const name = m[1].toLowerCase();
    if (!allowed.has(name) || seen.has(name)) continue;
    const raw = m[2] ?? m[3] ?? m[4] ?? '';
    let value;
    if (URL_ATTRS.has(name)) value = cleanUrlAttr(raw, name);
    else if (name === 'style') value = cleanStyle(raw) || null;
    else {
      const d = decodeEntities(raw);
      value = d.length <= 200 && SAFE_VALUE.test(d) ? d : null;
    }
    if (value === null) continue;
    seen.add(name);
    parts.push(`${name}="${escapeAttr(value)}"`);
  }
  if (tag === 'a') parts.push('rel="nofollow noopener ugc"', 'target="_blank"');
  if (tag === 'img') parts.push('loading="lazy"');
  return `<${tag}${parts.length ? ' ' + parts.join(' ') : ''}>`;
}

const TAG_RE = /^<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9]*)([^<>]*)>/;

/**
 * Profiles let people use fun HTML (glitter gifs, marquees, colored fonts).
 * This keeps those and strips anything that could run script. Plain line
 * breaks become <br>. Open tags are always closed so a comment can't break
 * the page layout.
 */
// A line break right next to one of these doesn't need a <br> (they already start a new line).
const BLOCK_TAGS = new Set([
  'p', 'div', 'center', 'marquee', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'hr', 'br',
  'table', 'tbody', 'thead', 'tr', 'td', 'th', 'blockquote',
]);
// Text directly inside these (between rows, list items...) is never shown by browsers.
const STRUCTURE_TAGS = new Set(['table', 'tbody', 'thead', 'tr', 'ul', 'ol']);

function tagNameAt(src, pos) {
  const m = /^<\s*\/?\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(src.slice(pos, pos + 40));
  return m ? m[1].toLowerCase() : '';
}

export function cleanHtml(dirty) {
  const src = String(dirty || '').slice(0, 50000);
  let out = '';
  const stack = [];
  let i = 0;
  let prevTag = '';

  while (i < src.length) {
    const lt = src.indexOf('<', i);
    const textEnd = lt === -1 ? src.length : lt;
    if (textEnd > i) {
      let text = src.slice(i, textEnd);
      const nextTag = lt === -1 ? '' : tagNameAt(src, lt);
      if (BLOCK_TAGS.has(prevTag)) text = text.replace(/^[ \t]*\r?\n/, '');
      if (BLOCK_TAGS.has(nextTag)) text = text.replace(/\r?\n[ \t]*$/, '');
      const top = stack[stack.length - 1];
      if (!/\S/.test(text) && STRUCTURE_TAGS.has(top)) text = '';
      out += escapeText(text).replace(/\r?\n/g, '<br>');
      i = textEnd;
      continue;
    }

    // At a "<"
    if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i + 4);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    const m = TAG_RE.exec(src.slice(i));
    if (!m) {
      out += '&lt;';
      i += 1;
      continue;
    }
    i += m[0].length;
    const closing = !!m[1];
    const tag = m[2].toLowerCase();
    prevTag = tag;

    if (!closing && DROP_CONTENT.has(tag)) {
      const close = new RegExp(`<\\s*/\\s*${tag}\\s*>`, 'i');
      const rest = src.slice(i);
      const cm = close.exec(rest);
      i = cm ? i + cm.index + cm[0].length : src.length;
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) continue; // drop the tag, keep its text

    if (closing) {
      const idx = stack.lastIndexOf(tag);
      if (idx === -1) continue; // stray closer: ignore
      while (stack.length > idx) out += `</${stack.pop()}>`;
      continue;
    }
    out += buildOpenTag(tag, m[3]);
    if (!VOID_TAGS.has(tag)) stack.push(tag);
  }
  while (stack.length) out += `</${stack.pop()}>`;
  return out;
}

/**
 * Custom profile CSS. The only real danger in modern browsers is breaking out
 * of the <style> tag, so every "<" is removed; a few legacy script vectors are
 * stripped too. Repeats until nothing changes so nested tricks collapse.
 */
export function cleanCss(css) {
  let s = String(css || '').slice(0, 20000);
  let prev;
  do {
    prev = s;
    s = s
      .replace(/</g, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/(java|vb)script\s*:/gi, '')
      .replace(/-moz-binding/gi, '')
      .replace(/behavior\s*:/gi, '')
      .replace(/@import/gi, '');
  } while (s !== prev);
  return s;
}
