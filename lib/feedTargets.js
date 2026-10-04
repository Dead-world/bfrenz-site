import { prisma } from './db';
import { canSeePost } from './feed';
import { getFriendIds } from './friends';
import { isAdmin, isBlockedEither } from './moderation';
import { getSurvey } from './surveys';

import { KEY_RE, WHAT, keyKind } from './feedKeys';

export { KEY_RE, WHAT, keyKind };

const NAME = { select: { id: true, username: true, displayName: true } };

/** { kind, owners: [userId], ownerName, url, what } or null if it's gone or hidden from me. */
export async function resolveTarget(me, key) {
  key = String(key || '');
  if (!KEY_RE.test(key) || !me) return null;
  const kind = keyKind(key);
  let id = key.slice(kind.length + 1);
  let owner = null;
  let url = '/home';
  switch (kind) {
    case 'p': {
      const post = await prisma.post.findUnique({ where: { id }, include: { author: NAME } });
      if (!post || !(await canSeePost(me, post, isAdmin(me)))) return null;
      return { kind, owners: [post.authorId], ownerName: post.author.displayName, url: `/post/${post.id}`, what: WHAT[kind] };
    }
    case 'b': {
      const b = await prisma.bulletin.findUnique({ where: { id }, include: { author: NAME } });
      owner = b?.author; url = `/bulletins/${id}`;
      break;
    }
    case 'ph': {
      const p = await prisma.photo.findUnique({ where: { id }, include: { user: NAME } });
      owner = p?.user; url = p ? `/${p.user.username}/photos${p.albumId ? `/${p.albumId}` : ''}` : url;
      break;
    }
    case 'v': {
      const v = await prisma.video.findUnique({ where: { id }, include: { user: NAME } });
      owner = v?.user; url = v ? `/${v.user.username}/videos#v-${v.id}` : url;
      break;
    }
    case 's': {
      id = id.slice(0, id.lastIndexOf('-'));
      owner = id ? await prisma.user.findUnique({ where: { id }, ...NAME }) : null;
      url = owner ? `/${owner.username}` : url;
      break;
    }
    case 'sv': {
      const a = await prisma.surveyAnswer.findUnique({ where: { id }, include: { user: NAME } });
      owner = a?.user; url = a ? `/surveys/${getSurvey(a.surveySlug)?.slug || a.surveySlug}/${a.user.username}` : url;
      break;
    }
    case 'bl': {
      const b = await prisma.blogPost.findUnique({ where: { id }, include: { author: NAME } });
      if (!b) return null;
      if (b.visibility === 'frenz' && b.authorId !== me.id && !isAdmin(me) && !(await getFriendIds(me.id)).includes(b.authorId)) return null;
      owner = b.author; url = `/${b.author.username}/blog/${b.id}`;
      break;
    }
    case 'gp': {
      const g = await prisma.groupPost.findUnique({ where: { id }, include: { author: NAME, group: { select: { slug: true } } } });
      owner = g?.author; url = g ? `/groups/${g.group.slug}#gp-${g.id}` : url;
      break;
    }
    case 'f': {
      const f = await prisma.friendship.findUnique({ where: { id }, include: { requester: NAME, addressee: NAME } });
      if (!f || f.status !== 'ACCEPTED') return null;
      for (const u of [f.requesterId, f.addresseeId]) if (await isBlockedEither(me.id, u)) return null;
      return { kind, owners: [f.requesterId, f.addresseeId], ownerName: `${f.requester.displayName} & ${f.addressee.displayName}`, url: `/${f.requester.username}`, what: WHAT[kind] };
    }
    default:
      return null;
  }
  if (!owner) return null;
  if (await isBlockedEither(me.id, owner.id)) return null;
  return { kind, owners: [owner.id], ownerName: owner.displayName, url, what: WHAT[kind] };
}
