/**
 * Every news-feed item has a key: p-<post>, b-<bulletin>, ph-<photo>, v-<video>,
 * s-<user>-<time> (profile song), f-<friendship>, sv-<survey answer>, bl-<blog>, gp-<group post>.
 * Likes, emoji reactions and comments hang off these keys. (No imports: safe to use anywhere.)
 */
export const KEY_RE = /^(p|b|ph|v|s|f|sv|bl|gp|pc|ic|bc|gr|c|u|l)-[A-Za-z0-9_-]{1,80}$/;

/** Gifts can also go to a profile (u-<user>) or a live stream (l-<stream>). Those can't be liked. */
export const GIFT_ONLY_KINDS = ['u', 'l'];

/**
 * Comments and replies can be liked too: pc-<post comment>, ic-<feed item comment>,
 * bc-<blog comment>, gr-<group reply>, c-<profile comment>.
 */
export const COMMENT_KINDS = ['pc', 'ic', 'bc', 'gr', 'c'];

/** Feed items whose comments live in ItemComment (posts, blogs and group posts have their own). */
export const ITEM_COMMENT_KINDS = ['b', 'ph', 'v', 's', 'f', 'sv'];

export const WHAT = { p: 'post', b: 'bulletin', ph: 'photos', v: 'video', s: 'profile song', f: 'new fren', sv: 'survey answers', bl: 'blog', gp: 'group post', pc: 'comment', ic: 'comment', bc: 'comment', gr: 'reply', c: 'comment', u: 'profile', l: 'live stream' };

/** The emoji reactions people can leave (one per person per item). */
export const EMOJIS = ['😂', '😍', '🔥', '😮', '😢', '😡', '💯', '🙌', '🥰', '😎', '💀', '👀'];

export function keyKind(key) {
  const k = String(key || '');
  return k.slice(0, k.indexOf('-'));
}
