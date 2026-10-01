import { songSource } from '@/lib/songEmbed';

/** A song inside a feed item: our player for audio files, the site's player for links. */
export default function MiniSong({ url, title }) {
  const s = songSource(url);
  if (!s) return null;
  if (s.kind === 'audio') return <audio className="feed-audio" controls preload="none" src={s.src} />;
  if (s.kind === 'embed') {
    return (
      <iframe
        className="song-embed feed-embed"
        src={s.src}
        title={title || `${s.provider} player`}
        height={Math.min(s.height, 166)}
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      />
    );
  }
  return (
    <a className="btn ghost small-btn" href={s.href} target="_blank" rel="noopener noreferrer">
      &#9654; Listen on {s.provider}
    </a>
  );
}
