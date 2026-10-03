import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { liveStreams, canGoLive, LIVE_MIN_AGE } from '@/lib/live';
import { sourceInfo } from '@/lib/liveEmbed';
import { Pic } from '@/components/Avatar';
import { timeAgo } from '@/lib/util';

export const metadata = { title: 'Live now | BFRENZ.com', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function LivePage() {
  const me = await requireUser();
  const streams = await liveStreams(me, 'all');
  const can = canGoLive(me);
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="actions" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 className="bigname" style={{ margin: 0 }}>🔴 Live now</h1>
        {can.ok && <Link href="/live/new" className="btn live-go-btn">● Go Live</Link>}
      </div>
      {!can.ok && (
        <p className="small muted">
          {can.reason === 'age-missing'
            ? <>Want to go live? <Link href="/edit">Add your age to your profile</Link> first (you need to be {LIVE_MIN_AGE}+).</>
            : <>Going live is for members {LIVE_MIN_AGE} and older. You can still watch!</>}
        </p>
      )}
      {streams.length === 0 ? (
        <div className="box"><div className="box-b small muted">Nobody&apos;s live right now. {can.ok ? <><Link href="/live/new">Be the first</Link>!</> : 'Check back soon!'}</div></div>
      ) : (
        <div className="live-grid">
          {streams.map((s) => (
            <Link key={s.id} href={`/live/${s.id}`} className="live-card box">
              <span className="live-card-top">
                <span className="live-pill">● LIVE</span>
                <span className="live-count">👀 {s.viewers}</span>
                {s.source !== 'browser' && <span className="live-count">{sourceInfo(s.source).emoji} {sourceInfo(s.source).label}</span>}
              </span>
              <span className="live-card-who">
                <Pic user={s.user} size={56} />
                <span>
                  <b>{s.user.displayName}</b>
                  <span className="small muted">started {timeAgo(s.startedAt)}</span>
                </span>
              </span>
              <span className="live-card-title">{s.title || `${s.user.displayName} is live`}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
