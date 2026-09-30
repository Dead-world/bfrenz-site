'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { cleanUrl, str, withParam } from '@/lib/util';
import { youtubeId } from '@/lib/video';

const MAX_VIDEOS = 200;

export async function addVideo(formData) {
  const me = await requireUser();
  const home = `/${me.username}/videos`;
  const title = str(formData, 'title', 100);
  const description = str(formData, 'description', 1000);
  let url = '';
  try {
    url = cleanUrl(formData.get('url'));
  } catch {
    url = '';
  }
  // Only accept our own uploads for files (Vercel Blob), anything else must be YouTube.
  if (url && !/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url)) url = '';
  const yt = url ? '' : youtubeId(formData.get('youtube'));

  if (!url && !yt) redirect(withParam(home, 'error', 'Upload a video or paste a YouTube link.'));
  if (!title) redirect(withParam(home, 'error', 'Give your video a title.'));
  const count = await prisma.video.count({ where: { userId: me.id } });
  if (count >= MAX_VIDEOS) redirect(withParam(home, 'error', `You can have up to ${MAX_VIDEOS} videos.`));

  const onProfile = formData.get('onProfile') === 'on';
  if (onProfile) await prisma.video.updateMany({ where: { userId: me.id }, data: { onProfile: false } });
  await prisma.video.create({ data: { userId: me.id, url, youtubeId: yt, title, description, onProfile } });
  redirect(withParam(home, 'posted', '1'));
}

export async function deleteVideo(formData) {
  const me = await requireUser();
  await prisma.video.deleteMany({ where: { id: str(formData, 'id', 40), userId: me.id } });
  redirect(`/${me.username}/videos?removed=1`);
}

/** Puts one video in the Video box on the profile (or takes it off). */
export async function featureVideo(formData) {
  const me = await requireUser();
  const id = str(formData, 'id', 40);
  const on = formData.get('on') === '1';
  const v = await prisma.video.findFirst({ where: { id, userId: me.id } });
  if (v) {
    await prisma.$transaction([
      prisma.video.updateMany({ where: { userId: me.id }, data: { onProfile: false } }),
      ...(on ? [prisma.video.update({ where: { id }, data: { onProfile: true } })] : []),
    ]);
  }
  redirect(on ? `/${me.username}` : `/${me.username}/videos`);
}

export async function renameVideo(formData) {
  const me = await requireUser();
  const title = str(formData, 'title', 100);
  if (title) {
    await prisma.video.updateMany({
      where: { id: str(formData, 'id', 40), userId: me.id },
      data: { title, description: str(formData, 'description', 1000) },
    });
  }
  redirect(`/${me.username}/videos?saved=1`);
}
