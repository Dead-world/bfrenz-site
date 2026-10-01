/** Plain text with clickable links and line breaks kept. Never renders HTML. */
const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;

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
          part
        ),
      )}
    </div>
  );
}
