import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Pic } from '@/components/Avatar';
import Badges from '@/components/Badges';
import { songSource } from '@/lib/songEmbed';

/** Songs members paid to promote. Plays only when clicked (no autoplay). */
export default async function FeaturedMusic({ take = 5 }) {
  const artists = await prisma.user.findMany({
    where: { songBoostUntil: { gt: new Date() }, songUrl: { not: '' }, bannedAt: null },
    orderBy: { songBoostUntil: 'desc' },
    take,
  });
  if (!artists.length) return null;
  return (
    <div className="box featured-music">
      <div className="box-h">
        🎵 Featured Music
        <Link href="/shop#boosts" className="right small">Promote yours</Link>
      </div>
      <div className="fm-list">
        {artists.map((a) => (
          <div key={a.id} className="fm-item">
            <Link href={`/${a.username}`}><Pic user={a} size={48} /></Link>
            <div className="fm-meta">
              <b>{a.songTitle || 'Untitled'}</b>
              <span className="small muted">
                <Link href={`/${a.username}`}>{a.songArtist || a.displayName}</Link>
                <Badges user={a} />
              </span>
              <MiniPlayer url={a.songUrl} title={a.songTitle} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniPlayer({ url, title }) {
  const source = songSource(url);
  if (!source) return null;
  if (source.kind === 'audio') return <audio controls preload="none" src={source.src} />;
  if (source.kind === 'embed') {
    return (
      <iframe
        className="song-embed fm-embed"
        src={source.src}
        title={title || `${source.provider} player`}
        height={Math.min(source.height, 166)}
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      />
    );
  }
  return (
    <a className="small" href={source.href} target="_blank" rel="noopener noreferrer">&#9654; Listen on {source.provider}</a>
  );
}
