import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CREATOR_TYPES, creatorLabel, followingIds } from '@/lib/creators';
import { hiddenUserIds } from '@/lib/moderation';
import { followCreator, unfollowCreator } from '@/app/actions/creators';
import { Pic } from '@/components/Avatar';
import Badges, { Name } from '@/components/Badges';
import Notice from '@/components/Notice';

export const metadata = {
  title: 'Discover Creators | BFRENZ.com',
  description: 'Musicians, DJs, YouTubers, streamers, artists and more on BFRENZ. Follow your favorites.',
  alternates: { canonical: '/creators' },
};

const PERSON = {
  id: true, username: true, displayName: true, avatarUrl: true, headline: true, creatorType: true, nameColor: true,
  nameEffect: true, nameEffectsOwned: true, lifetimeSupporter: true, isOfficial: true, supporterUntil: true,
  bonusSupporterUntil: true, artistPro: true, isArtist: true, createdAt: true,
};

export default async function CreatorsPage({ searchParams }) {
  const sp = await searchParams;
  const me = await getCurrentUser();
  const type = CREATOR_TYPES.some(([k]) => k === sp?.type) ? String(sp.type) : '';
  const [hidden, mine] = me ? await Promise.all([hiddenUserIds(me.id), followingIds(me.id)]) : [[], []];
  const following = new Set(mine);

  const creators = await prisma.user.findMany({
    where: {
      bannedAt: null,
      isOfficial: false,
      ...(type ? { creatorType: type } : { creatorType: { not: '' } }),
      ...(hidden.length ? { id: { notIn: hidden } } : {}),
    },
    select: PERSON,
    take: 300,
  });
  const counts = creators.length
    ? await prisma.follow.groupBy({ by: ['followingId'], where: { followingId: { in: creators.map((c) => c.id) } }, _count: { _all: true } })
    : [];
  const fc = Object.fromEntries(counts.map((c) => [c.followingId, c._count._all]));
  const popular = [...creators].sort((a, b) => (fc[b.id] || 0) - (fc[a.id] || 0) || b.createdAt - a.createdAt).slice(0, 60);
  const newest = type ? [] : [...creators].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
  const back = `/creators${type ? `?type=${type}` : ''}`;

  const Card = ({ c }) => {
    const lab = creatorLabel(c.creatorType);
    const on = following.has(c.id);
    return (
      <div className="creator-card">
        <Link href={`/${c.username}`}><Pic user={c} size={84} /></Link>
        <Link href={`/${c.username}`} className="creator-card-name"><b><Name user={c} /></b><Badges user={c} /></Link>
        <span className="creator-tag small">{lab.emoji} {lab.label}</span>
        <span className="small muted">{(fc[c.id] || 0).toLocaleString()} {fc[c.id] === 1 ? 'follower' : 'followers'}</span>
        {c.headline && <span className="small creator-card-head">&ldquo;{c.headline.slice(0, 70)}&rdquo;</span>}
        {me && me.id !== c.id ? (
          <form action={on ? unfollowCreator : followCreator}>
            <input type="hidden" name="userId" value={c.id} />
            <input type="hidden" name="back" value={back} />
            <button type="submit" className={`btn small-btn${on ? ' ghost' : ''}`}>{on ? '✓ Following' : '+ Follow'}</button>
          </form>
        ) : !me ? (
          <Link href="/signup" className="btn small-btn">+ Follow</Link>
        ) : null}
      </div>
    );
  };

  return (
    <div className="creators-page">
      <div className="actions" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <h1 className="bigname" style={{ margin: 0 }}>Discover Creators 🎥</h1>
        {me && !me.creatorType && <Link href="/edit?tab=creator" className="btn small-btn">I&apos;m a creator</Link>}
        {me?.creatorType && <Link href="/creator/stats" className="btn ghost small-btn">📊 My stats</Link>}
      </div>
      <Notice sp={sp} />
      <div className="creator-filters">
        <Link href="/creators" className={`mood-chip${!type ? ' on' : ''}`}>All</Link>
        {CREATOR_TYPES.map(([k, label, emoji]) => (
          <Link key={k} href={`/creators?type=${k}`} className={`mood-chip${type === k ? ' on' : ''}`}>{emoji} {label}</Link>
        ))}
      </div>

      {newest.length > 0 && (
        <section className="box">
          <div className="box-h">New creators</div>
          <div className="creator-grid">{newest.map((c) => <Card key={c.id} c={c} />)}</div>
        </section>
      )}
      <section className="box">
        <div className="box-h">{type ? `${creatorLabel(type).emoji} ${creatorLabel(type).label}s` : 'Most followed'}</div>
        {popular.length === 0 ? (
          <div className="box-b small muted">
            No creators here yet. {me ? <Link href="/edit?tab=creator">Be the first!</Link> : <Link href="/signup">Join and be the first!</Link>}
          </div>
        ) : (
          <div className="creator-grid">{popular.map((c) => <Card key={c.id} c={c} />)}</div>
        )}
      </section>
    </div>
  );
}
