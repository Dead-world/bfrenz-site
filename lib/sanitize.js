import sanitizeHtml from 'sanitize-html';

const COLOR = [/^[#a-z0-9(),.\s%]+$/i];

const HTML_OPTIONS = {
  allowedTags: [
    'b', 'i', 'u', 's', 'strong', 'em', 'br', 'p', 'div', 'span', 'center', 'font',
    'img', 'a', 'marquee', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'hr', 'table',
    'tbody', 'thead', 'tr', 'td', 'th', 'blockquote', 'small', 'big', 'sup', 'sub',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'width', 'height', 'title'],
    font: ['color', 'size', 'face'],
    marquee: ['direction', 'behavior', 'scrollamount'],
    table: ['border', 'cellpadding', 'cellspacing', 'width', 'align', 'bgcolor'],
    td: ['colspan', 'rowspan', 'align', 'valign', 'width', 'bgcolor'],
    th: ['colspan', 'rowspan', 'align', 'width', 'bgcolor'],
    div: ['align'],
    p: ['align'],
    '*': ['style'],
  },
  allowedStyles: {
    '*': {
      color: COLOR,
      'background-color': COLOR,
      'font-size': [/^\d+(\.\d+)?(px|em|pt|%)$/],
      'font-weight': [/^(bold|normal|\d{3})$/],
      'font-style': [/^(italic|normal)$/],
      'font-family': [/^[\w\s,'"-]+$/],
      'text-align': [/^(left|right|center|justify)$/],
      'text-decoration': [/^[a-z\s-]+$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener ugc', target: '_blank' }),
  },
};

/**
 * Old-school profiles let people use HTML (glitter gifs, marquees, colored
 * fonts). This keeps the fun tags and strips anything that could run script.
 * Plain line breaks are kept as <br>.
 */
export function cleanHtml(dirty) {
  const withBreaks = String(dirty || '').replace(/\r?\n/g, '<br>');
  return sanitizeHtml(withBreaks, HTML_OPTIONS);
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
