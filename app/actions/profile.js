'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { cleanCss } from '@/lib/sanitize';
import { cleanUrl, str, withParam } from '@/lib/util';
import { cleanPlaylist } from '@/lib/playlist';

function done(tab) {
  redirect(`/edit?tab=${tab}&saved=1`);
}

function tryUrl(value, tab) {
  try {
    return cleanUrl(value);
  } catch (e) {
    redirect(withParam(`/edit?tab=${tab}`, 'error', e.message));
  }
}

export async function updateInfo(formData) {
  const me = await requireUser();
  const ageRaw = str(formData, 'age', 3);
  const age = ageRaw ? Math.min(Math.max(parseInt(ageRaw, 10) || 0, 13), 120) : null;
  const bm = parseInt(str(formData, 'birthMonth', 2), 10);
  const bd = parseInt(str(formData, 'birthDay', 2), 10);
  const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const hasBday = bm >= 1 && bm <= 12 && bd >= 1 && bd <= DAYS[bm - 1];
  await prisma.user.update({
    where: { id: me.id },
    data: {
      displayName: str(formData, 'displayName', 40) || me.username,
      headline: str(formData, 'headline', 140),
      mood: str(formData, 'mood', 60),
      gender: str(formData, 'gender', 30),
      age,
      birthMonth: hasBday ? bm : null,
      birthDay: hasBday ? bd : null,
      location: str(formData, 'location', 80),
      aboutMe: str(formData, 'aboutMe', 20000),
      meet: str(formData, 'meet', 10000),
      isArtist: formData.get('isArtist') === 'on' || me.artistPro,
      genre: str(formData, 'genre', 40),
    },
  });
  done('info');
}

export async function updateInterests(formData) {
  const me = await requireUser();
  await prisma.user.update({
    where: { id: me.id },
    data: {
      interestsGeneral: str(formData, 'interestsGeneral', 3000),
      interestsMusic: str(formData, 'interestsMusic', 3000),
      interestsMovies: str(formData, 'interestsMovies', 3000),
      interestsTv: str(formData, 'interestsTv', 3000),
      interestsBooks: str(formData, 'interestsBooks', 3000),
      interestsHeroes: str(formData, 'interestsHeroes', 3000),
    },
  });
  done('interests');
}

export async function updatePic(formData) {
  const me = await requireUser();
  const avatarUrl = tryUrl(formData.get('avatarUrl'), 'pic');
  await prisma.user.update({ where: { id: me.id }, data: { avatarUrl } });
  if (avatarUrl) {
    // Keep a copy in their photos too.
    const exists = await prisma.photo.findFirst({ where: { userId: me.id, url: avatarUrl } });
    if (!exists) {
      // Keep them together in a "Profile Pics" album, like the old days.
      let album = await prisma.album.findFirst({ where: { userId: me.id, name: 'Profile Pics' } });
      if (!album) album = await prisma.album.create({ data: { userId: me.id, name: 'Profile Pics' } });
      await prisma.photo.create({ data: { userId: me.id, url: avatarUrl, caption: 'Profile pic', albumId: album.id } });
    }
  }
  done('pic');
}

export async function updateSong(formData) {
  const me = await requireUser();
  let songUrl = tryUrl(formData.get('songUrl'), 'song');
  let songTitle = str(formData, 'songTitle', 100);
  let songArtist = str(formData, 'songArtist', 100);
  const playlist = cleanPlaylist(formData.get('playlist'));
  // No main song but there are playlist songs? The first one becomes the main song.
  if (!songUrl && playlist.length) {
    const first = playlist.shift();
    songUrl = first.url;
    songTitle = first.title;
    songArtist = first.artist;
  }
  await prisma.user.update({
    where: { id: me.id },
    data: {
      songUrl,
      ...(songUrl && songUrl !== me.songUrl ? { songUpdatedAt: new Date() } : {}),
      songTitle,
      songArtist,
      playlist,
    },
  });
  done('song');
}

export async function updateCss(formData) {
  const me = await requireUser();
  await prisma.user.update({
    where: { id: me.id },
    data: { customCss: cleanCss(formData.get('customCss')) },
  });
  done('css');
}
