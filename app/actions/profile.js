'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { cleanCss } from '@/lib/sanitize';
import { cleanUrl, str, withParam } from '@/lib/util';

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
  await prisma.user.update({
    where: { id: me.id },
    data: {
      displayName: str(formData, 'displayName', 40) || me.username,
      headline: str(formData, 'headline', 140),
      mood: str(formData, 'mood', 60),
      gender: str(formData, 'gender', 30),
      age,
      location: str(formData, 'location', 80),
      aboutMe: str(formData, 'aboutMe', 20000),
      meet: str(formData, 'meet', 10000),
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
    if (!exists) await prisma.photo.create({ data: { userId: me.id, url: avatarUrl, caption: 'Profile pic' } });
  }
  done('pic');
}

export async function updateSong(formData) {
  const me = await requireUser();
  const songUrl = tryUrl(formData.get('songUrl'), 'song');
  await prisma.user.update({
    where: { id: me.id },
    data: {
      songUrl,
      songTitle: str(formData, 'songTitle', 100),
      songArtist: str(formData, 'songArtist', 100),
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
