'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ANSWER_MAX, getSurvey } from '@/lib/surveys';

function clean(v) {
  return String(v || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .trim()
    .slice(0, ANSWER_MAX);
}

/** Save (or update) my answers. The first save shows up in my frenz' feeds. */
export async function saveSurvey(formData) {
  const me = await requireUser();
  const survey = getSurvey(formData.get('slug'));
  if (!survey) redirect('/surveys');
  const answers = survey.questions.map((_, i) => clean(formData.get(`a${i}`)));
  const count = answers.filter(Boolean).length;
  if (count < 3) {
    redirect(`/surveys/${survey.slug}?error=${encodeURIComponent('Answer at least 3 questions first.')}`);
  }
  await prisma.surveyAnswer.upsert({
    where: { surveySlug_userId: { surveySlug: survey.slug, userId: me.id } },
    create: { surveySlug: survey.slug, userId: me.id, answers },
    update: { answers },
  });
  redirect(`/surveys/${survey.slug}/${me.username}?saved=1`);
}

export async function deleteSurvey(formData) {
  const me = await requireUser();
  const slug = String(formData.get('slug') || '');
  await prisma.surveyAnswer.deleteMany({ where: { surveySlug: slug, userId: me.id } });
  redirect('/surveys?deleted=1');
}
