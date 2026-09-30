'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { str, withParam } from '@/lib/util';

const MAX_ALBUMS = 100;

async function myAlbum(me, id) {
  const album = await prisma.album.findFirst({ where: { id, userId: me.id } });
  if (!album) redirect(withParam(`/${me.username}/photos`, 'error', 'That album is gone.'));
  return album;
}

export async function createAlbum(formData) {
  const me = await requireUser();
  const name = str(formData, 'name', 60);
  const description = str(formData, 'description', 300);
  const home = `/${me.username}/photos`;
  if (!name) redirect(withParam(home, 'error', 'Give your album a name.'));
  const count = await prisma.album.count({ where: { userId: me.id } });
  if (count >= MAX_ALBUMS) redirect(withParam(home, 'error', `You can have up to ${MAX_ALBUMS} albums.`));
  const album = await prisma.album.create({ data: { userId: me.id, name, description } });
  redirect(`${home}/${album.id}?created=1`);
}

export async function updateAlbum(formData) {
  const me = await requireUser();
  const album = await myAlbum(me, str(formData, 'id', 40));
  const name = str(formData, 'name', 60) || album.name;
  await prisma.album.update({
    where: { id: album.id },
    data: { name, description: str(formData, 'description', 300) },
  });
  redirect(`/${me.username}/photos/${album.id}?saved=1`);
}

/** Deletes the album. keepPhotos=on moves its photos to "Not in an album" instead of deleting them. */
export async function deleteAlbum(formData) {
  const me = await requireUser();
  const album = await myAlbum(me, str(formData, 'id', 40));
  const keep = formData.get('keepPhotos') === 'on';
  if (keep) {
    await prisma.album.delete({ where: { id: album.id } }); // photos fall back to no album
  } else {
    const photos = await prisma.photo.findMany({ where: { albumId: album.id, userId: me.id }, select: { url: true } });
    await prisma.$transaction([
      prisma.photo.deleteMany({ where: { albumId: album.id, userId: me.id } }),
      prisma.album.delete({ where: { id: album.id } }),
    ]);
    if (photos.some((p) => p.url === me.avatarUrl)) {
      await prisma.user.update({ where: { id: me.id }, data: { avatarUrl: '' } });
    }
  }
  redirect(`/${me.username}/photos?deleted=1`);
}

export async function setAlbumCover(formData) {
  const me = await requireUser();
  const photo = await prisma.photo.findFirst({ where: { id: str(formData, 'photoId', 40), userId: me.id } });
  if (!photo?.albumId) redirect(`/${me.username}/photos`);
  await prisma.album.update({ where: { id: photo.albumId }, data: { coverUrl: photo.url } });
  redirect(`/${me.username}/photos/${photo.albumId}?cover=1`);
}

/** Moves a photo into another album (or out of all albums when albumId is empty). */
export async function movePhoto(formData) {
  const me = await requireUser();
  const photo = await prisma.photo.findFirst({ where: { id: str(formData, 'photoId', 40), userId: me.id } });
  const back = String(formData.get('back') || '');
  const home = back.startsWith(`/${me.username}/photos`) ? back : `/${me.username}/photos`;
  if (!photo) redirect(home);
  const target = str(formData, 'albumId', 40);
  if (target) await myAlbum(me, target);
  await prisma.photo.update({ where: { id: photo.id }, data: { albumId: target || null } });
  if (photo.albumId && photo.albumId !== target) {
    await prisma.album.updateMany({ where: { id: photo.albumId, coverUrl: photo.url }, data: { coverUrl: '' } });
  }
  redirect(withParam(home, 'moved', '1'));
}
