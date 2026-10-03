/**
 * @mentions and #hashtags in plain text (posts, comments, group walls).
 * No database here, so it's safe to use in the browser too.
 */

// @name: 3-20 letters, numbers or _ (same rules as usernames), not part of an email address.
const MENTION = /(^|[^a-zA-Z0-9_@.])@([a-zA-Z0-9_]{3,20})(?![a-zA-Z0-9_])/g;
// #tag: up to 40 letters, numbers or _, with at least one letter (so "#1" isn't a tag).
const HASHTAG = /(^|[^a-zA-Z0-9_&#/])#([a-zA-Z0-9_]*[a-zA-Z][a-zA-Z0-9_]*)(?![a-zA-Z0-9_])/g;
export const MAX_MENTIONS = 10;
export const TAG_MAX = 40;

export function extractMentions(text) {
  const out = [];
  for (const m of String(text || '').matchAll(MENTION)) {
    const u = m[2].toLowerCase();
    if (!out.includes(u)) out.push(u);
    if (out.length >= MAX_MENTIONS) break;
  }
  return out;
}

export function extractTags(text) {
  const out = [];
  for (const m of String(text || '').matchAll(HASHTAG)) {
    const t = m[2].toLowerCase();
    if (t.length <= TAG_MAX && !out.includes(t)) out.push(t);
  }
  return out;
}

/** A tag as typed in a URL or search box: "#Pop_Punk" -> "pop_punk" ("" if it isn't a valid tag). */
export function cleanTag(raw) {
  const t = String(raw || '').trim().replace(/^#/, '').toLowerCase();
  return /^[a-z0-9_]*[a-z][a-z0-9_]*$/.test(t) && t.length <= TAG_MAX ? t : '';
}

/** Does this text really contain #tag (not just #tagger)? */
export function hasTag(text, tag) {
  return extractTags(text).includes(tag);
}

/**
 * Splits plain text into pieces: { t: 'text' | 'mention' | 'tag', v }.
 * The text before a mark (a space, a bracket) stays in the text piece.
 */
export function tokenize(text) {
  const s = String(text || '');
  const marks = [];
  for (const m of s.matchAll(MENTION)) marks.push({ at: m.index + m[1].length, len: m[2].length + 1, t: 'mention', v: m[2] });
  for (const m of s.matchAll(HASHTAG)) if (m[2].length <= TAG_MAX) marks.push({ at: m.index + m[1].length, len: m[2].length + 1, t: 'tag', v: m[2] });
  marks.sort((a, b) => a.at - b.at);
  const out = [];
  let i = 0;
  for (const k of marks) {
    if (k.at < i) continue;
    if (k.at > i) out.push({ t: 'text', v: s.slice(i, k.at) });
    out.push({ t: k.t, v: k.v });
    i = k.at + k.len;
  }
  if (i < s.length) out.push({ t: 'text', v: s.slice(i) });
  return out;
}
