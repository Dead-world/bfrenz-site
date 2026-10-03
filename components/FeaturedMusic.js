import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Pic } from '@/components/Avatar';
import Badges from '@/components/Badges';
import MiniSong from '@/components/MiniSong';

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
              <MiniSong url={a.songUrl} title={a.songTitle} compact />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
