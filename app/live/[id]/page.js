import Link from 'next/link';
import { giftTotals } from '@/lib/giftsDb';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { loadStream } from '@/lib/live';
import { isAdmin, isBlockedEither } from '@/lib/moderation';
import { Pic } from '@/components/Avatar';
import { Name } from '@/components/Badges';
import LiveViewer from '@/components/LiveViewer';
import { headers } from 'next/headers';
import { siteUrl } from '@/lib/email';
import { sourceInfo, streamEmbedUrl, streamPageUrl } from '@/lib/liveEmbed';

export const metadata = { title: 'Live | BFRENZ.com', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function WatchPage({ params }) {
  const me = await requireUser();
  const { id } = await params;
  const s = await loadStream(id);
  if (!s) notFound();
  const admin = isAdmin(me);
  if (!admin && (await isBlockedEither(me.id, s.userId))) notFound();
  let link = null;
  if (s.source && s.source !== 'browser') {
    // Twitch only plays on sites it's told about, so pass our own domain names.
    const host = (await headers()).get('host') || '';
    let siteHost = '';
    try {
      siteHost = new URL(siteUrl()).host;
    } catch {}
    const info = sourceInfo(s.source);
    link = {
      source: s.source,
      label: info.label,
      emoji: info.emoji,
      embed: streamEmbedUrl(s.source, s.streamRef, [host, siteHost, 'bfrenz.com', 'www.bfrenz.com']),
      page: streamPageUrl(s.source, s.streamRef),
    };
  }
  const gifts = (await giftTotals([`l-${s.id}`]).catch(() => new Map())).get(`l-${s.id}`) || null;
  return (
    <div>
      <div className="live-head">
        <Link href={`/${s.user.username}`}><Pic user={s.user} size={48} /></Link>
        <div>
          <b><Link href={`/${s.user.username}`}><Name user={s.user} /></Link></b>
          <div className="small muted">{s.title || 'Live on BFRENZ'}</div>
        </div>
        <Link href="/live" className="btn ghost small-btn" style={{ marginLeft: 'auto' }}>More live</Link>
      </div>
      <LiveViewer streamId={s.id} streamer={{ name: s.user.displayName, username: s.user.username }} admin={admin} link={link} coins={me.coins} gifts={gifts} mine={s.userId === me.id} />
    </div>
  );
}
