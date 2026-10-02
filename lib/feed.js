import { prisma } from './db';
import { getFriendIds } from './friends';
import { hiddenUserIds } from './moderation';

export const PAGE = 20;

const AUTHOR = { select: { id: true, username: true, displayName: true, avatarUrl: true, nameColor: true, nameEffect: true, nameEffectsOwned: true, lifetimeSupporter: true, supporterUntil: true, bonusSupporterUntil: true, artistPro: true, isArtist: true } };

/** Full post data for the feed, including the 3 newest comments and whether I gave kudos. */
export function postInclude(meId) {
  return {
    author: AUTHOR,
    _count: { select: { comments: true, kudos: true } },
    comments: { orderBy: { createdAt: 'desc' }, take: 3, include: { author: AUTHOR } },
    kudos: { where: { userId: meId }, select: { id: true } },
  };
}

/**
 * The news feed: friends' (and my own) status posts mixed with things that happen
 * on their profiles (bulletins, new photos, videos, profile songs, new frenz).
 * Newest first, nothing hidden, no algorithm. `before` pages back in time.
 */
export async function getFeed(me, before = null) {
  const [friendIds, hidden] = await Promise.all([getFriendIds(me.id), hiddenUserIds(me.id)]);
  const h = new Set(hidden);
  const people = [me.id, ...friendIds.filter((id) => !h.has(id))];
  const when = before ? { lt: before } : undefined;
  const author = { bannedAt: null };
  const founder = (process.env.FOUNDER_USERNAME || '').toLowerCase();

  const myGroups = (
    await prisma.groupMember.findMany({ where: { userId: me.id, role: { not: 'banned' } }, select: { groupId: true } })
  ).map((g) => g.groupId);

  const [posts, bulletins, photos, videos, songs, frenz, surveys, blogs, groupPosts] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: { in: people }, author, ...(when ? { createdAt: when } : {}) },
      orderBy: { createdAt: 'desc' },
      take: PAGE,
      include: postInclude(me.id),
    }),
    prisma.bulletin.findMany({
      where: { authorId: { in: people }, author, ...(when ? { createdAt: when } : {}) },
      orderBy: { createdAt: 'desc' },
      take: PAGE,
      include: { author: AUTHOR },
    }),
    prisma.photo.findMany({
      where: { userId: { in: people }, user: author, ...(when ? { createdAt: when } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: AUTHOR, album: { select: { id: true, name: true } } },
    }),
    prisma.video.findMany({
      where: { userId: { in: people }, user: author, ...(when ? { createdAt: when } : {}) },
      orderBy: { createdAt: 'desc' },
      take: PAGE,
      include: { user: AUTHOR },
    }),
    prisma.user.findMany({
      where: { id: { in: people }, bannedAt: null, songUrl: { not: '' }, songUpdatedAt: when || { not: null } },
      orderBy: { songUpdatedAt: 'desc' },
      take: PAGE,
      select: { ...AUTHOR.select, songUrl: true, songTitle: true, songArtist: true, songUpdatedAt: true },
    }),
    prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        requesterId: { in: people },
        addresseeId: { in: people },
        requester: { bannedAt: null, ...(founder ? { username: { not: founder } } : {}) },
        addressee: { bannedAt: null, ...(founder ? { username: { not: founder } } : {}) },
        ...(when ? { createdAt: when } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE,
      include: { requester: AUTHOR, addressee: AUTHOR },
    }),
    prisma.surveyAnswer.findMany({
      where: { userId: { in: people }, user: author, ...(when ? { createdAt: when } : {}) },
      orderBy: { createdAt: 'desc' },
      take: PAGE,
      include: { user: AUTHOR },
    }),
    prisma.blogPost.findMany({
      where: { authorId: { in: people }, author, ...(when ? { createdAt: when } : {}) },
      orderBy: { createdAt: 'desc' },
      take: PAGE,
      include: { author: AUTHOR, _count: { select: { comments: true } } },
    }),
    myGroups.length
      ? prisma.groupPost.findMany({
          where: {
            groupId: { in: myGroups },
            author,
            ...(hidden.length ? { authorId: { notIn: hidden } } : {}),
            ...(when ? { createdAt: when } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: PAGE,
          include: { author: AUTHOR, group: { select: { slug: true, name: true, avatarUrl: true } }, _count: { select: { replies: true } } },
        })
      : [],
  ]);

  // Photos uploaded together (same person, same album, within an hour) become one item.
  const photoGroups = [];
  for (const p of photos) {
    const g = photoGroups.find(
      (x) => x.user.id === p.userId && x.albumId === (p.albumId || null) && x.at - p.createdAt < 60 * 60 * 1000,
    );
    if (g) g.photos.push(p);
    else photoGroups.push({ type: 'photos', id: `ph-${p.id}`, at: p.createdAt, user: p.user, albumId: p.albumId || null, album: p.album, photos: [p] });
  }

  const items = [
    ...posts.map((p) => ({ type: 'post', id: `p-${p.id}`, at: p.createdAt, post: p })),
    ...bulletins.map((b) => ({ type: 'bulletin', id: `b-${b.id}`, at: b.createdAt, bulletin: b })),
    ...photoGroups,
    ...videos.map((v) => ({ type: 'video', id: `v-${v.id}`, at: v.createdAt, video: v, user: v.user })),
    ...songs.map((u) => ({ type: 'song', id: `s-${u.id}-${+u.songUpdatedAt}`, at: u.songUpdatedAt, user: u })),
    ...frenz.map((f) => ({ type: 'frenz', id: `f-${f.id}`, at: f.createdAt, a: f.requester, b: f.addressee })),
    ...surveys.map((a) => ({ type: 'survey', id: `sv-${a.id}`, at: a.createdAt, answer: a, user: a.user })),
    ...blogs.map((b) => ({ type: 'blog', id: `bl-${b.id}`, at: b.createdAt, blog: b, user: b.author })),
    ...groupPosts.map((g) => ({ type: 'grouppost', id: `gp-${g.id}`, at: g.createdAt, gpost: g, user: g.author })),
  ].sort((x, y) => y.at - x.at);

  const page = items.slice(0, PAGE);
  const more = items.length > PAGE;
  return { items: page, next: more && page.length ? page[page.length - 1].at.toISOString() : null };
}

/** Can this member see this post? (author, their friends, or an admin) */
export async function canSeePost(me, post, admin = false) {
  if (!me) return false;
  if (admin || post.authorId === me.id) return true;
  const friends = await getFriendIds(me.id);
  if (!friends.includes(post.authorId)) return false;
  return !(await hiddenUserIds(me.id)).includes(post.authorId);
}
