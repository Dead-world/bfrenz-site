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
import { isAdmin } from '@/lib/moderation';
import { notify } from '@/lib/push';

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
  await prisma.post.create({
    data: { authorId: me.id, body, mood, imageUrls, videoUrl, youtubeId: yt, songUrl, visibility },
  });
  // Posting a mood also updates the Mood line on your profile.
  if (mood) await prisma.user.update({ where: { id: me.id }, data: { mood } });
  revalidatePath('/home');
  redirect(withParam(to, 'posted', '1'));
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

export async function toggleKudos(formData) {
  const me = await requireUser();
  const post = await visiblePost(me, str(formData, 'id', 40));
  if (post) {
    const existing = await prisma.kudos.findUnique({ where: { postId_userId: { postId: post.id, userId: me.id } } });
    if (existing) await prisma.kudos.delete({ where: { id: existing.id } });
    else {
      const made = await prisma.kudos.create({ data: { postId: post.id, userId: me.id } }).catch(() => null);
      if (made && post.authorId !== me.id) {
        notify(post.authorId, { title: `★ ${me.displayName} gave your post kudos`, body: post.body.slice(0, 100), url: `/post/${post.id}`, tag: `kudos-${post.id}` });
      }
    }
  }
  redirect(`${back(formData)}#${post ? `post-${post.id}` : ''}`);
}

export async function addPostComment(formData) {
  const me = await requireUser();
  const to = back(formData);
  const post = await visiblePost(me, str(formData, 'id', 40));
  const body = String(formData.get('body') || '').replace(/\r/g, '').trim().slice(0, 1000);
  if (!post) redirect(withParam(to, 'error', 'That post is gone.'));
  if (!body) redirect(`${to}#post-${post.id}`);
  const recent = await prisma.postComment.count({
    where: { authorId: me.id, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
  });
  if (recent >= 15) redirect(withParam(to, 'error', 'Slow down! Too many comments in a minute.'));
  await prisma.postComment.create({ data: { postId: post.id, authorId: me.id, body } });
  if (post.authorId !== me.id) {
    notify(post.authorId, { title: `💬 ${me.displayName} commented on your post`, body: body.slice(0, 110), url: `/post/${post.id}` });
  }
  redirect(`${to}#post-${post.id}`);
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
