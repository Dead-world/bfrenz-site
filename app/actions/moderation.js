'use server';

import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { emailConfigured, sendEmail, siteUrl } from '@/lib/email';
import { REPORT_KINDS, REPORT_REASONS, isAdmin, reasonLabel } from '@/lib/moderation';
import { safeBack, str, withParam } from '@/lib/util';

// ------------------------------------------------------------------
// Members: report and block
// ------------------------------------------------------------------

/** Figures out who posted the reported thing (and that the reporter can see it). */
async function ownerOf(kind, id, me) {
  switch (kind) {
    case 'profile':
      return (await prisma.user.findUnique({ where: { id }, select: { id: true } }))?.id;
    case 'comment':
      return (await prisma.comment.findUnique({ where: { id }, select: { authorId: true } }))?.authorId;
    case 'bulletin':
      return (await prisma.bulletin.findUnique({ where: { id }, select: { authorId: true } }))?.authorId;
    case 'photo':
      return (await prisma.photo.findUnique({ where: { id }, select: { userId: true } }))?.userId;
    case 'video':
      return (await prisma.video.findUnique({ where: { id }, select: { userId: true } }))?.userId;
    case 'post':
      return (await prisma.post.findUnique({ where: { id }, select: { authorId: true } }))?.authorId;
    case 'postcomment':
      return (await prisma.postComment.findUnique({ where: { id }, select: { authorId: true } }))?.authorId;
    case 'survey':
      return (await prisma.surveyAnswer.findUnique({ where: { id }, select: { userId: true } }))?.userId;
    case 'blog':
      return (await prisma.blogPost.findUnique({ where: { id }, select: { authorId: true } }))?.authorId;
    case 'blogcomment':
      return (await prisma.blogComment.findUnique({ where: { id }, select: { authorId: true } }))?.authorId;
    case 'group':
      return (await prisma.group.findUnique({ where: { id }, select: { ownerId: true } }))?.ownerId;
    case 'grouppost':
      return (await prisma.groupPost.findUnique({ where: { id }, select: { authorId: true } }))?.authorId;
    case 'groupreply':
      return (await prisma.groupReply.findUnique({ where: { id }, select: { authorId: true } }))?.authorId;
    case 'message': {
      const m = await prisma.message.findUnique({ where: { id }, select: { senderId: true, recipientId: true } });
      return m && m.recipientId === me.id ? m.senderId : null;
    }
    default:
      return null;
  }
}

export async function submitReport(formData) {
  const me = await requireUser();
  const kind = str(formData, 'kind', 20);
  const targetId = str(formData, 'id', 40);
  const reason = str(formData, 'reason', 30);
  const details = str(formData, 'details', 2000);
  const back = safeBack(formData.get('back'), '/home');
  const retry = `/report?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(targetId)}&back=${encodeURIComponent(back)}`;

  if (!REPORT_KINDS.includes(kind)) redirect(back);
  if (!REPORT_REASONS.some(([k]) => k === reason)) redirect(withParam(retry, 'error', 'Pick a reason.'));

  const targetUserId = await ownerOf(kind, targetId, me);
  if (!targetUserId) redirect(withParam(back, 'error', "That couldn't be found. It may already be gone."));
  if (targetUserId === me.id) redirect(withParam(back, 'error', "You can't report your own stuff. You can delete it instead."));

  const recent = await prisma.report.count({
    where: { reporterId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= 10) redirect(withParam(back, 'error', "You've sent a lot of reports this hour. Try again later."));

  const already = await prisma.report.findFirst({
    where: { reporterId: me.id, kind, targetId, status: 'OPEN' },
    select: { id: true },
  });
  if (!already) {
    await prisma.report.create({ data: { reporterId: me.id, kind, targetId, targetUserId, reason, details } });
    await notifyAdmins({ kind, reason, details, reporter: me.username });
  }
  redirect(withParam(back, 'reported', '1'));
}

/** Emails the site owner about a new report, if email is set up. Never blocks the report. */
async function notifyAdmins({ kind, reason, details, reporter }) {
  const to = String(process.env.REPORT_EMAIL || process.env.CONTACT_EMAIL || '').trim();
  if (!to || !emailConfigured()) return;
  const urgent = reason === 'child_safety';
  try {
    await sendEmail({
      to,
      subject: `${urgent ? 'URGENT ' : ''}BFRENZ report: ${reasonLabel(reason)} (${kind})`,
      text: `@${reporter} reported a ${kind}.\nReason: ${reasonLabel(reason)}\n${details ? `Details: ${details}\n` : ''}\nReview it: ${siteUrl()}/admin`,
    });
  } catch (err) {
    console.error('[report] admin email failed:', err?.message);
  }
}

export async function blockUser(formData) {
  const me = await requireUser();
  const otherId = str(formData, 'userId', 40);
  const back = safeBack(formData.get('back'), '/home');
  if (!otherId || otherId === me.id) redirect(back);
  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true } });
  if (!other) redirect(back);

  const either = {
    OR: [
      { requesterId: me.id, addresseeId: otherId },
      { requesterId: otherId, addresseeId: me.id },
    ],
  };
  await prisma.$transaction([
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: me.id, blockedId: otherId } },
      create: { blockerId: me.id, blockedId: otherId },
      update: {},
    }),
    prisma.friendship.deleteMany({ where: either }),
    prisma.topFriend.deleteMany({
      where: {
        OR: [
          { userId: me.id, friendId: otherId },
          { userId: otherId, friendId: me.id },
        ],
      },
    }),
    // Their comments on my page go away too.
    prisma.comment.deleteMany({ where: { profileId: me.id, authorId: otherId } }),
  ]);
  redirect(withParam(back, 'blocked', '1'));
}

export async function unblockUser(formData) {
  const me = await requireUser();
  const otherId = str(formData, 'userId', 40);
  const back = safeBack(formData.get('back'), '/blocked');
  await prisma.block.deleteMany({ where: { blockerId: me.id, blockedId: otherId } });
  redirect(withParam(back, 'unblocked', '1'));
}

// ------------------------------------------------------------------
// Admins
// ------------------------------------------------------------------

async function requireAdmin() {
  const me = await requireUser();
  if (!isAdmin(me)) notFound();
  return me;
}

function adminBack(formData) {
  const back = safeBack(formData.get('back'), '/admin');
  return back.startsWith('/admin') ? back : '/admin';
}

async function deleteContent(kind, id) {
  switch (kind) {
    case 'comment':
      await prisma.comment.deleteMany({ where: { id } });
      break;
    case 'bulletin':
      await prisma.bulletin.deleteMany({ where: { id } });
      break;
    case 'message':
      await prisma.message.deleteMany({ where: { id } });
      break;
    case 'photo': {
      const p = await prisma.photo.findUnique({ where: { id } });
      if (p) {
        await prisma.photo.delete({ where: { id } });
        await prisma.user.updateMany({ where: { id: p.userId, avatarUrl: p.url }, data: { avatarUrl: '' } });
      }
      break;
    }
    case 'video':
      await prisma.video.deleteMany({ where: { id } });
      break;
    case 'post':
      await prisma.post.deleteMany({ where: { id } });
      break;
    case 'postcomment':
      await prisma.postComment.deleteMany({ where: { id } });
      break;
    case 'survey':
      await prisma.surveyAnswer.deleteMany({ where: { id } });
      break;
    case 'blog':
      await prisma.blogPost.deleteMany({ where: { id } });
      break;
    case 'blogcomment':
      await prisma.blogComment.deleteMany({ where: { id } });
      break;
    case 'group':
      await prisma.group.deleteMany({ where: { id } });
      break;
    case 'grouppost':
      await prisma.groupPost.deleteMany({ where: { id } });
      break;
    case 'groupreply':
      await prisma.groupReply.deleteMany({ where: { id } });
      break;
    case 'profile':
      // "Delete" on a profile report wipes the profile's text, pic, song and CSS (not the account).
      await prisma.user.updateMany({
        where: { id },
        data: { aboutMe: '', meet: '', headline: '', mood: '', avatarUrl: '', customCss: '', songUrl: '', songTitle: '', songArtist: '', playlist: [], theme: '', awayMessage: '' },
      });
      break;
  }
}

/** action = dismiss | remove (delete the content and close the report). */
export async function handleReport(formData) {
  const me = await requireAdmin();
  const id = str(formData, 'id', 40);
  const action = str(formData, 'action', 20);
  const note = str(formData, 'note', 500);
  const r = await prisma.report.findUnique({ where: { id } });
  if (!r) redirect(adminBack(formData));

  if (action === 'remove') await deleteContent(r.kind, r.targetId);

  // Close every open report about the same thing at once.
  await prisma.report.updateMany({
    where: { kind: r.kind, targetId: r.targetId, status: 'OPEN' },
    data: {
      status: action === 'remove' ? 'RESOLVED' : 'DISMISSED',
      resolvedAt: new Date(),
      resolvedBy: me.username,
      note,
    },
  });
  redirect(withParam(adminBack(formData), 'saved', '1'));
}

export async function banUser(formData) {
  const me = await requireAdmin();
  const userId = str(formData, 'userId', 40);
  const reason = str(formData, 'reason', 300);
  const wipe = formData.get('wipe') === 'on';
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) redirect(adminBack(formData));
  if (target.id === me.id || isAdmin(target)) {
    redirect(withParam(adminBack(formData), 'error', "Admins can't be banned here. Remove them from ADMIN_USERNAMES first."));
  }

  const ops = [
    prisma.user.update({
      where: { id: userId },
      data: {
        bannedAt: new Date(),
        banReason: reason,
        sessionVersion: { increment: 1 }, // logs them out everywhere
        featuredUntil: null,
        songBoostUntil: null,
      },
    }),
    prisma.bulletin.updateMany({ where: { authorId: userId }, data: { sponsoredUntil: null } }),
    prisma.report.updateMany({
      where: { targetUserId: userId, status: 'OPEN' },
      data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy: me.username, note: 'Member banned' },
    }),
  ];
  if (wipe) {
    ops.push(
      prisma.comment.deleteMany({ where: { authorId: userId } }),
      prisma.bulletin.deleteMany({ where: { authorId: userId } }),
      prisma.message.deleteMany({ where: { senderId: userId } }),
      prisma.photo.deleteMany({ where: { userId } }),
      prisma.video.deleteMany({ where: { userId } }),
      prisma.chatMessage.deleteMany({ where: { fromId: userId } }),
      prisma.post.deleteMany({ where: { authorId: userId } }),
      prisma.postComment.deleteMany({ where: { authorId: userId } }),
      prisma.surveyAnswer.deleteMany({ where: { userId } }),
      prisma.blogPost.deleteMany({ where: { authorId: userId } }),
      prisma.blogComment.deleteMany({ where: { authorId: userId } }),
      prisma.groupPost.deleteMany({ where: { authorId: userId } }),
      prisma.groupReply.deleteMany({ where: { authorId: userId } }),
      prisma.stampGift.deleteMany({ where: { fromId: userId } }),
    );
  }
  await prisma.$transaction(ops);
  redirect(withParam(adminBack(formData), 'saved', '1'));
}

export async function unbanUser(formData) {
  await requireAdmin();
  const userId = str(formData, 'userId', 40);
  await prisma.user.update({ where: { id: userId }, data: { bannedAt: null, banReason: '' } });
  redirect(withParam(adminBack(formData), 'saved', '1'));
}

/**
 * Free perks from the admin page (e.g. a free week of Featured Music for an artist).
 * gift = song_boost | feature | pro_artist | supporter
 */
export async function giftPerk(formData) {
  const me = await requireAdmin();
  const userId = str(formData, 'userId', 40);
  const gift = str(formData, 'gift', 20);
  const days = Math.min(Math.max(parseInt(str(formData, 'days', 3), 10) || 7, 1), 365);
  const u = await prisma.user.findUnique({ where: { id: userId } });
  const back = adminBack(formData);
  if (!u || u.bannedAt) redirect(withParam(back, 'error', 'Member not found.'));

  const DAY = 24 * 60 * 60 * 1000;
  const extend = (cur) => {
    const base = cur && new Date(cur) > new Date() ? new Date(cur).getTime() : Date.now();
    return new Date(base + days * DAY);
  };

  let data;
  if (gift === 'song_boost') {
    if (!u.songUrl) redirect(withParam(back, 'error', `@${u.username} needs a profile song first.`));
    data = { songBoostUntil: extend(u.songBoostUntil) };
  } else if (gift === 'feature') {
    data = { featuredUntil: extend(u.featuredUntil) };
  } else if (gift === 'supporter') {
    data = { bonusSupporterUntil: extend(u.bonusSupporterUntil) };
  } else if (gift === 'pro_artist') {
    data = { artistPro: true, isArtist: true };
  } else {
    redirect(back);
  }
  await prisma.user.update({ where: { id: userId }, data });
  console.log(`[admin] @${me.username} gifted ${gift}${gift === 'pro_artist' ? '' : ` (${days}d)`} to @${u.username}`);
  redirect(withParam(back, 'gifted', u.username));
}
