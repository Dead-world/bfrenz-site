import { prisma } from './db';
import { getFriendIds } from './friends';
import { hiddenUserIds } from './moderation';
import { followingIds } from './creators';
import { attachReactions, attachFeedCommentLikes } from './reactions';
import { attachItemComments } from './itemComments';

export const PAGE = 20;

const AUTHOR = { select: { id: true, username: true, displayName: true, avatarUrl: true, nameColor: true, nameEffect: true, nameEffectsOwned: true, lifetimeSupporter: true, isOfficial: true, supporterUntil: true, bonusSupporterUntil: true, artistPro: true, isArtist: true } };

/** Full post data for the feed, including the 3 newest comments. (Likes are attached separately.) */
export function postInclude(meId) {
  return {
    author: AUTHOR,
    _count: { select: { comments: true } },
    // The 3 newest top-level comments, each with its replies (threads are one level deep).
    comments: {
      where: { parentId: null },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { author: AUTHOR, replies: { orderBy: { createdAt: 'asc' }, take: 20, include: { author: AUTHOR } } },
    },
  };
}

/**
 * The news feed: friends' (and my own) status posts mixed with things that happen
 * on their profiles (bulletins, new photos, videos, profile songs, new frenz).
 * Newest first, nothing hidden, no algorithm. `before` pages back in time.
 */
export async function getFeed(me, before = null) {
  const [friendIds, hidden, followed] = await Promise.all([getFriendIds(me.id), hiddenUserIds(me.id), followingIds(me.id)]);
  const h = new Set(hidden);
  // Creators I follow (but am not frenz with): I see their public posts and blogs.
  const fans = followed.filter((id) => !h.has(id));
  const people = [me.id, ...friendIds.filter((id) => !h.has(id))];
  const when = before ? { lt: before } : undefined;
  const author = { bannedAt: null };
  const founder = (process.env.FOUNDER_USERNAME || '').toLowerCase();

  const myGroups = (
    await prisma.groupMember.findMany({ where: { userId: me.id, role: { not: 'banned' } }, select: { groupId: true } })
  ).map((g) => g.groupId);

  const [posts, bulletins, photos, videos, songs, frenz, surveys, blogs, groupPosts] = await Promise.all([
    prisma.post.findMany({
      // Friends' posts, plus posts from the site's official (clearly labeled) bot account.
      where: {
        AND: [{ OR: [{ authorId: { in: people } }, { author: { isOfficial: true } }, { authorId: { in: fans }, visibility: 'public' }] }],
        author,
        ...(when ? { createdAt: when } : {}),
      },
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
      where: { OR: [{ authorId: { in: people } }, { authorId: { in: fans }, visibility: 'public' }], author, ...(when ? { createdAt: when } : {}) },
      orderBy: { createdAt: 'desc' },
      take: PAGE,
      include: {
        author: AUTHOR,
        _count: { select: { comments: true } },
        comments: { where: { author: { bannedAt: null }, ...(hidden.length ? { authorId: { notIn: hidden } } : {}) }, orderBy: { createdAt: 'desc' }, take: 3, include: { author: AUTHOR } },
      },
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
          include: {
            author: AUTHOR,
            group: { select: { slug: true, name: true, avatarUrl: true } },
            _count: { select: { replies: true } },
            replies: { where: { author: { bannedAt: null }, ...(hidden.length ? { authorId: { notIn: hidden } } : {}) }, orderBy: { createdAt: 'desc' }, take: 3, include: { author: AUTHOR } },
          },
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

  // Name each photo group after its first photo, so its likes stay put when more photos join it.
  for (const g of photoGroups) g.id = `ph-${g.photos[g.photos.length - 1].id}`;

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
  await Promise.all([attachReactions(page, me.id), attachItemComments(page, hidden)]);
  // Status posts draw their own likes bar from post.rx.
  for (const i of page) if (i.type === 'post') i.post.rx = i.rx;
  await attachFeedCommentLikes(page, me.id);
  return { items: page, next: more && page.length ? page[page.length - 1].at.toISOString() : null };
}

/** Can this member see this post? (author, their friends, or an admin) */
export async function canSeePost(me, post, admin = false) {
  if (!me) return false;
  if (admin || post.authorId === me.id) return true;
  if ((await hiddenUserIds(me.id)).includes(post.authorId)) return false;
  // Public posts (creators) and the official bot's posts are open to every member.
  if (post.visibility === 'public') return true;
  const official = post.author?.isOfficial ?? (await prisma.user.findUnique({ where: { id: post.authorId }, select: { isOfficial: true } }))?.isOfficial;
  if (official) return true;
  const friends = await getFriendIds(me.id);
  if (!friends.includes(post.authorId)) return false;
  return !(await hiddenUserIds(me.id)).includes(post.authorId);
}
