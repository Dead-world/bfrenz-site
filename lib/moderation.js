import { prisma } from './db';

/**
 * Admins: the FOUNDER_USERNAME plus anyone listed in ADMIN_USERNAMES
 * (comma separated, e.g. "creatorofbfrenz,mybestfriend").
 */
export function adminUsernames() {
  return [process.env.FOUNDER_USERNAME || '', ...(process.env.ADMIN_USERNAMES || '').split(',')]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(user) {
  return !!user && !user.bannedAt && adminUsernames().includes(user.username);
}

export function isBanned(user) {
  return !!user?.bannedAt;
}

/** Prisma filter: members who aren't banned. */
export const NOT_BANNED = { bannedAt: null };

export const REPORT_KINDS = ['profile', 'comment', 'bulletin', 'message', 'photo', 'video', 'post', 'postcomment', 'survey'];

export const REPORT_REASONS = [
  ['child_safety', 'Involves a minor in a sexual or unsafe way'],
  ['harassment', 'Harassment or bullying'],
  ['hate', 'Hate speech or threats'],
  ['sexual', 'Nudity or sexual content'],
  ['violence', 'Violence or self-harm'],
  ['spam', 'Spam or scam'],
  ['impersonation', 'Pretending to be someone else'],
  ['private_info', "Sharing someone's private info"],
  ['copyright', 'Uses my music, photos or work without permission'],
  ['other', 'Something else'],
];

export function reasonLabel(key) {
  return REPORT_REASONS.find(([k]) => k === key)?.[1] || key;
}

/** Did either person block the other? */
export async function isBlockedEither(a, b) {
  if (!a || !b || a === b) return false;
  const row = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return !!row;
}

export async function didBlock(blockerId, blockedId) {
  if (!blockerId || !blockedId) return false;
  const row = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    select: { id: true },
  });
  return !!row;
}

/** Everyone this member blocked or was blocked by (used to hide them from each other). */
export async function hiddenUserIds(userId) {
  if (!userId) return [];
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId));
}

/**
 * Loads what a report points at, as plain text for the admin page.
 * Returns { text, link, exists }.
 */
export async function reportTarget(r) {
  const plain = (s) =>
    String(s || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 600);
  switch (r.kind) {
    case 'comment': {
      const c = await prisma.comment.findUnique({ where: { id: r.targetId }, include: { profile: true } });
      return c ? { exists: true, text: plain(c.body), link: `/${c.profile.username}#comments` } : { exists: false };
    }
    case 'bulletin': {
      const b = await prisma.bulletin.findUnique({ where: { id: r.targetId } });
      return b ? { exists: true, text: `${b.subject}: ${plain(b.body)}`, link: `/bulletins/${b.id}` } : { exists: false };
    }
    case 'message': {
      const m = await prisma.message.findUnique({ where: { id: r.targetId } });
      return m ? { exists: true, text: `${m.subject}: ${plain(m.body)}`, link: null } : { exists: false };
    }
    case 'photo': {
      const p = await prisma.photo.findUnique({ where: { id: r.targetId }, include: { user: true } });
      return p
        ? { exists: true, text: p.caption || '(no caption)', image: p.url, link: `/${p.user.username}/photos${p.albumId ? `/${p.albumId}` : ''}#p-${p.id}` }
        : { exists: false };
    }
    case 'post': {
      const p = await prisma.post.findUnique({ where: { id: r.targetId } });
      return p
        ? {
            exists: true,
            text: `${p.body ? plain(p.body) : '(no text)'}${p.imageUrls.length ? ` [${p.imageUrls.length} photo(s)]` : ''}${p.videoUrl || p.youtubeId ? ' [video]' : ''}${p.songUrl ? ' [song]' : ''}`,
            image: p.imageUrls[0] || null,
            link: `/post/${p.id}`,
          }
        : { exists: false };
    }
    case 'postcomment': {
      const c = await prisma.postComment.findUnique({ where: { id: r.targetId } });
      return c ? { exists: true, text: plain(c.body), link: `/post/${c.postId}` } : { exists: false };
    }
    case 'video': {
      const v = await prisma.video.findUnique({ where: { id: r.targetId }, include: { user: true } });
      return v
        ? { exists: true, text: `${v.title}${v.description ? `: ${plain(v.description)}` : ''}${v.youtubeId ? ' (YouTube)' : ''}`, link: `/${v.user.username}/videos#v-${v.id}` }
        : { exists: false };
    }
    case 'survey': {
      const a = await prisma.surveyAnswer.findUnique({ where: { id: r.targetId }, include: { user: true } });
      if (!a) return { exists: false };
      const { getSurvey, answeredPairs } = await import('./surveys');
      const s = getSurvey(a.surveySlug);
      const text = s ? answeredPairs(s, a.answers).map(([q, ans]) => `${q} ${ans}`).join(' · ') : a.answers.join(' · ');
      return { exists: true, text: plain(text), link: `/surveys/${a.surveySlug}/${a.user.username}` };
    }
    case 'profile': {
      const u = await prisma.user.findUnique({ where: { id: r.targetId } });
      return u
        ? { exists: true, text: `${u.headline ? `"${u.headline}" ` : ''}${plain(u.aboutMe).slice(0, 400)}`, image: u.avatarUrl || null, link: `/${u.username}` }
        : { exists: false };
    }
    default:
      return { exists: false };
  }
}
