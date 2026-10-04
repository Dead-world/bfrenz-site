'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { cleanUrl, safeBack, str, withParam } from '@/lib/util';
import { youtubeId } from '@/lib/video';
import { songSource } from '@/lib/songEmbed';
import { MOODS } from '@/lib/moods';
import { canSeePost } from '@/lib/feed';
import { isAdmin, isBlockedEither } from '@/lib/moderation';
import { notify } from '@/lib/push';
import { sendMentions } from '@/lib/mentions';
import { after } from 'next/server';

const BLOB = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;
const MAX_IMAGES = 4;

function back(formData, fallback = '/home') {
  return safeBack(formData.get('back'), fallback);
}

export async function createPost(formData) {
  const me = await requireUser();
  const to = back(formData);
  const body = String(formData.get('body') || '').replace(/\r/g, '').trim().slice(0, 2000);
  const moodRaw = str(formData, 'mood', 30);
  const mood = MOODS.some(([, m]) => m === moodRaw) ? moodRaw : '';

  const imageUrls = [];
  for (const raw of formData.getAll('image')) {
    let u = '';
    try {
      u = cleanUrl(raw);
    } catch {}
    if (u && BLOB.test(u) && !imageUrls.includes(u)) imageUrls.push(u);
    if (imageUrls.length >= MAX_IMAGES) break;
  }
  let videoUrl = '';
  try {
    videoUrl = cleanUrl(formData.get('videoUrl'));
  } catch {}
  if (!BLOB.test(videoUrl)) videoUrl = '';
  const yt = videoUrl ? '' : youtubeId(formData.get('youtube'));
  let songUrl = '';
  try {
    songUrl = cleanUrl(formData.get('songUrl'));
  } catch {}
  if (songUrl && !songSource(songUrl)) songUrl = '';

  if (!body && !imageUrls.length && !videoUrl && !yt && !songUrl && !mood) {
    redirect(withParam(to, 'error', 'Write something or add a photo, video or song.'));
  }
  const recent = await prisma.post.count({
    where: { authorId: me.id, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  if (recent >= 10) redirect(withParam(to, 'error', 'Slow down! You can post 10 times every 10 minutes.'));

  // Creators can post publicly (followers and everyone see it); everyone else posts to frenz.
  const visibility = me.creatorType && formData.get('visibility') === 'public' ? 'public' : 'frenz';
  const post = await prisma.post.create({
    data: { authorId: me.id, body, mood, imageUrls, videoUrl, youtubeId: yt, songUrl, visibility },
  });
  if (body.includes('@')) after(() => sendMentions(me, body, { kind: 'post', targetId: post.id, url: `/post/${post.id}`, post }));
  // Posting a mood also updates the Mood line on your profile.
  if (mood) await prisma.user.update({ where: { id: me.id }, data: { mood } });
  revalidatePath('/home');
  redirect(withParam(to, 'posted', '1'));
}

/**
 * The author edits their post: text, mood, who sees it, and taking off photos / video / song.
 * (New photos aren't added here; that stays in the composer.)
 */
export async function editPost(formData) {
  const me = await requireUser();
  const to = back(formData);
  const id = str(formData, 'id', 40);
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.authorId !== me.id) redirect(withParam(to, 'error', 'You can only edit your own posts.'));

  const body = String(formData.get('body') || '').replace(/\r/g, '').trim().slice(0, 2000);
  const moodRaw = str(formData, 'mood', 30);
  const mood = MOODS.some(([, m]) => m === moodRaw) ? moodRaw : '';
  const keep = new Set(formData.getAll('keepImage').map(String));
  const imageUrls = post.imageUrls.filter((u) => keep.has(u));
  const videoUrl = formData.get('keepVideo') ? post.videoUrl : '';
  const youtube = formData.get('keepVideo') ? post.youtubeId : '';
  const songUrl = formData.get('keepSong') ? post.songUrl : '';
  if (!body && !imageUrls.length && !videoUrl && !youtube && !songUrl && !mood) {
    redirect(withParam(`${to.split('#')[0]}`, 'error', 'A post can’t be empty. Delete it instead?'));
  }
  // Creators choose; a post that's currently boosted stays public until the boost ends.
  const boosted = post.boostUntil && new Date(post.boostUntil) > new Date();
  const visibility = boosted || (me.creatorType && formData.get('visibility') === 'public') ? 'public' : 'frenz';

  const changed =
    body !== post.body || mood !== post.mood || visibility !== post.visibility || imageUrls.length !== post.imageUrls.length ||
    videoUrl !== post.videoUrl || youtube !== post.youtubeId || songUrl !== post.songUrl;
  if (changed) {
    const saved = await prisma.post.update({
      where: { id },
      data: { body, mood, imageUrls, videoUrl, youtubeId: youtube, songUrl, visibility, editedAt: new Date() },
    });
    // Anyone newly @mentioned gets told (people already told aren't told twice).
    if (body.includes('@')) after(() => sendMentions(me, body, { kind: 'post', targetId: id, url: `/post/${id}`, post: saved }));
    revalidatePath('/home');
  }
  redirect(`${to.split('#')[0]}#post-${id}`);
}

export async function deletePost(formData) {
  const me = await requireUser();
  const id = str(formData, 'id', 40);
  const post = await prisma.post.findUnique({ where: { id } });
  if (post && (post.authorId === me.id || isAdmin(me))) await prisma.post.delete({ where: { id } });
  const to = back(formData);
  redirect(to.startsWith('/post/') ? '/home' : to);
}

async function visiblePost(me, id) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || !(await canSeePost(me, post, isAdmin(me)))) return null;
  return post;
}

export async function addPostComment(formData) {
  const me = await requireUser();
  const to = back(formData);
  const post = await visiblePost(me, str(formData, 'id', 40));
  const body = String(formData.get('body') || '').replace(/\r/g, '').trim().slice(0, 1000);
  if (!post) redirect(withParam(to, 'error', 'That post is gone.'));
  if (!body) redirect(`${to}#post-${post.id}`);

  // Replies always hang off the top-level comment; replying to a reply also alerts that person.
  let parent = null;
  let replyTo = null;
  const parentId = str(formData, 'parentId', 40);
  if (parentId) {
    parent = await prisma.postComment.findUnique({ where: { id: parentId } });
    if (parent?.parentId) {
      replyTo = parent;
      parent = await prisma.postComment.findUnique({ where: { id: parent.parentId } });
    }
    if (!parent || parent.postId !== post.id) redirect(withParam(to, 'error', 'That comment is gone.'));
    for (const who of [parent.authorId, replyTo?.authorId]) {
      if (who && who !== me.id && (await isBlockedEither(me.id, who))) redirect(withParam(to, 'error', "You can't reply to this member."));
    }
  }

  const recent = await prisma.postComment.count({
    where: { authorId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
  });
  if (recent >= 15) redirect(withParam(to, 'error', 'Slow down! Too many comments in a minute.'));
  const comment = await prisma.postComment.create({ data: { postId: post.id, authorId: me.id, body, parentId: parent?.id || null } });

  const url = `/post/${post.id}#pc-${comment.id}`;
  const told = new Set([me.id]);
  const tell = (id, title) => {
    if (!id || told.has(id)) return;
    told.add(id);
    notify(id, { title, body: body.slice(0, 110), url });
  };
  if (replyTo) tell(replyTo.authorId, `↩︎ ${me.displayName} replied to you`);
  if (parent) tell(parent.authorId, `↩︎ ${me.displayName} replied to your comment`);
  tell(post.authorId, parent ? `💬 ${me.displayName} replied on your post` : `💬 ${me.displayName} commented on your post`);
  if (body.includes('@')) {
    after(() => sendMentions(me, body, { kind: 'comment', targetId: comment.id, url, post, skip: [...told] }));
  }
  redirect(`${to}#pc-${comment.id}`);
}

export async function deletePostComment(formData) {
  const me = await requireUser();
  const c = await prisma.postComment.findUnique({ where: { id: str(formData, 'id', 40) }, include: { post: true } });
  // The commenter, the post's author, or an admin can delete it.
  if (c && (c.authorId === me.id || c.post.authorId === me.id || isAdmin(me))) {
    await prisma.postComment.delete({ where: { id: c.id } });
  }
  redirect(`${back(formData)}#${c ? `post-${c.postId}` : ''}`);
}
