// No database imports here, so this is safe to use anywhere.
/** Plain-text preview of a blog entry. */
export function blogSnippet(html, max = 200) {
  const text = String(html || '')
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}
