import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hiddenUserIds } from '@/lib/moderation';
import { Pic } from '@/components/Avatar';
import { Name } from '@/components/Badges';
import { timeAgo } from '@/lib/util';

export const metadata = { title: 'Mentions | BFRENZ.com', robots: { index: false } };

const WHERE = { post: 'in a post', comment: 'in a comment', grouppost: 'in a group', groupreply: 'in a group reply' };
const FROM = { select: { id: true, username: true, displayName: true, avatarUrl: true, nameColor: true, nameEffect: true, nameEffectsOwned: true, lifetimeSupporter: true, isOfficial: true, supporterUntil: true, bonusSupporterUntil: true, artistPro: true, isArtist: true } };

/** Drops mentions whose post or comment has since been deleted. */
async function stillThere(list) {
  const ids = (k) => list.filter((m) => m.kind === k).map((m) => m.targetId);
  const [posts, comments, itemComments, gposts, greplies] = await Promise.all([
    prisma.post.findMany({ where: { id: { in: ids('post') } }, select: { id: true } }),
    prisma.postComment.findMany({ where: { id: { in: ids('comment') } }, select: { id: true } }),
    prisma.itemComment.findMany({ where: { id: { in: ids('comment') } }, select: { id: true } }),
    prisma.groupPost.findMany({ where: { id: { in: ids('grouppost') } }, select: { id: true } }),
    prisma.groupReply.findMany({ where: { id: { in: ids('groupreply') } }, select: { id: true } }),
  ]);
  const ok = new Set([...posts, ...comments, ...itemComments, ...gposts, ...greplies].map((r) => r.id));
  return list.filter((m) => ok.has(m.targetId));
}

export default async function MentionsPage() {
  const me = await requireUser();
  const hidden = await hiddenUserIds(me.id);
  const raw = await prisma.mention.findMany({
    where: { userId: me.id, from: { bannedAt: null }, ...(hidden.length ? { fromId: { notIn: hidden } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: { from: FROM },
  });
  const list = await stillThere(raw);
  await prisma.mention.updateMany({ where: { userId: me.id, seen: false }, data: { seen: true } });

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 className="bigname">@ Mentions</h1>
      <p className="small muted" style={{ marginTop: -6 }}>
        When someone writes <b>@{me.username}</b> in a post, comment or group, it shows up here.
      </p>
      {list.length === 0 ? (
        <div className="box"><div className="box-b small muted">No mentions yet. Tag your frenz with @ in a post and they&apos;ll probably tag you back 😉</div></div>
      ) : (
        <div className="box">
          {list.map((m) => (
            <Link key={m.id} href={m.url} className={`mention-row${raw.find((r) => r.id === m.id && !r.seen) ? ' new' : ''}`}>
              <Pic user={m.from} size={44} />
              <span className="mention-main">
                <span className="small"><b><Name user={m.from} /></b> mentioned you {WHERE[m.kind] || ''} · <span className="muted">{timeAgo(m.createdAt)}</span></span>
                <span className="small mention-snippet">{m.snippet}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
