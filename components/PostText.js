import { tokenize } from '@/lib/tags';

/**
 * Plain text with clickable links, @mentions and #hashtags, and line breaks kept. Never renders HTML.
 * (Plain <a> tags, so it works in server and client components alike.)
 */
const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;

function Rich({ text, k }) {
  return tokenize(text).map((p, i) => {
    if (p.t === 'mention') return <a key={`${k}-${i}`} href={`/${p.v.toLowerCase()}`} className="mention">@{p.v}</a>;
    if (p.t === 'tag') return <a key={`${k}-${i}`} href={`/tag/${p.v.toLowerCase()}`} className="hashtag">#{p.v}</a>;
    return p.v;
  });
}

export default function PostText({ text, className = 'post-text' }) {
  if (!text) return null;
  const parts = String(text).split(URL_RE);
  return (
    <div className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="nofollow noopener noreferrer ugc">
            {part.length > 60 ? part.slice(0, 57) + '…' : part}
          </a>
        ) : (
          <Rich key={i} text={part} k={i} />
        ),
      )}
    </div>
  );
}
