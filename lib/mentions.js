import { prisma } from './db';
import { notify } from './push';
import { extractMentions, extractTags, hasTag } from './tags';
import { canSeePost } from './feed';
import { isBlockedEither, hiddenUserIds } from './moderation';
import { getFriendIds } from './friends';

const KIND_TEXT = {
  post: 'mentioned you in a post',
  comment: 'mentioned you in a comment',
  grouppost: 'mentioned you in a group',
  groupreply: 'mentioned you in a group',
};

/**
 * Records and sends @mention alerts. Only people who can actually see the post are alerted
 * (a frenz-only post won't ping a stranger), never the author, banned members, the bot,
 * or anyone blocked either way. Never throws.
 *
 * where: { kind, targetId, url, post? (status post, for visibility), groupId? }
 */
export async function sendMentions(me, text, where) {
  try {
    const names = extractMentions(text).filter((n) => n !== me.username);
    const skip = new Set(where.skip || []); // people already told by a "replied to you" alert
    if (!names.length) return 0;
    const people = await prisma.user.findMany({
      where: { username: { in: names }, bannedAt: null, isOfficial: false },
      select: { id: true, username: true },
    });
    let sent = 0;
    for (const u of people) {
      if (u.id === me.id || skip.has(u.id) || (await isBlockedEither(me.id, u.id))) continue;
      if (where.post && !(await canSeePost(u, where.post))) continue;
      if (where.groupId) {
        const m = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: where.groupId, userId: u.id } }, select: { role: true } });
        if (m?.role === 'banned') continue;
      }
      // One alert per person per post/comment, even if edited or repeated.
      const dupe = await prisma.mention.findFirst({ where: { userId: u.id, targetId: where.targetId, kind: where.kind, fromId: me.id }, select: { id: true } });
      if (dupe) continue;
      await prisma.mention.create({
        data: { userId: u.id, fromId: me.id, kind: where.kind, targetId: where.targetId, url: where.url, snippet: String(text).slice(0, 160) },
      });
      notify(u.id, { title: `@ ${me.displayName} ${KIND_TEXT[where.kind] || 'mentioned you'}`, body: String(text).slice(0, 110), url: where.url, tag: `mention-${where.targetId}` });
      sent++;
    }
    return sent;
  } catch (err) {
    console.error('[mentions] failed:', err?.message);
    return 0;
  }
}

export async function unseenMentionCount(userId) {
  return prisma.mention.count({ where: { userId, seen: false, from: { bannedAt: null } } });
}

// ---------------- hashtags ----------------

/** Who's posts can this member see? (null = logged out: public posts only) */
async function visibleWhere(me) {
  if (!me) return { visibility: 'public' };
  const friends = await getFriendIds(me.id);
  return { OR: [{ visibility: 'public' }, { authorId: { in: [me.id, ...friends] } }, { author: { isOfficial: true } }] };
}

/** Status posts with #tag that this member is allowed to see, newest first. */
export async function postsWithTag(me, tag, include, before = null, take = 20) {
  const hidden = me ? await hiddenUserIds(me.id) : [];
  const found = [];
  let cursor = before;
  // The database finds "#tag" anywhere; we then drop look-alikes such as #tagger.
  for (let round = 0; round < 4 && found.length < take; round++) {
    const batch = await prisma.post.findMany({
      where: {
        AND: [await visibleWhere(me), { body: { contains: `#${tag}`, mode: 'insensitive' } }],
        author: { bannedAt: null },
        ...(hidden.length ? { authorId: { notIn: hidden } } : {}),
        ...(cursor ? { createdAt: { lt: cursor } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: take * 2,
      include,
    });
    for (const p of batch) if (hasTag(p.body, tag) && found.length < take) found.push(p);
    if (batch.length < take * 2) break;
    cursor = batch[batch.length - 1].createdAt;
  }
  return found;
}

/** Most-used tags in public posts and group walls over the last week. */
export async function trendingTags(limit = 12, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [posts, gposts] = await Promise.all([
    prisma.post.findMany({ where: { createdAt: { gte: since }, OR: [{ visibility: 'public' }, { author: { isOfficial: true } }], author: { bannedAt: null }, body: { contains: '#' } }, select: { body: true, authorId: true }, take: 2000, orderBy: { createdAt: 'desc' } }),
    prisma.groupPost.findMany({ where: { createdAt: { gte: since }, author: { bannedAt: null }, body: { contains: '#' } }, select: { body: true, authorId: true }, take: 2000, orderBy: { createdAt: 'desc' } }),
  ]);
  // Count each tag once per person, so one member spamming a tag can't make it trend.
  const seen = new Map();
  for (const p of [...posts, ...gposts]) {
    for (const t of extractTags(p.body)) {
      if (!seen.has(t)) seen.set(t, new Set());
      seen.get(t).add(p.authorId);
    }
  }
  return [...seen.entries()]
    .map(([tag, who]) => ({ tag, count: who.size }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

/** Group wall posts with #tag (newest first). */
export async function groupPostsWithTag(me, tag, take = 10) {
  const hidden = me ? await hiddenUserIds(me.id) : [];
  const rows = await prisma.groupPost.findMany({
    where: {
      body: { contains: `#${tag}`, mode: 'insensitive' },
      author: { bannedAt: null },
      group: { owner: { bannedAt: null } },
      ...(hidden.length ? { authorId: { notIn: hidden } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: take * 2,
    include: {
      author: { select: { username: true, displayName: true, avatarUrl: true } },
      group: { select: { slug: true, name: true, avatarUrl: true } },
    },
  });
  return rows.filter((p) => hasTag(p.body, tag)).slice(0, take);
}
