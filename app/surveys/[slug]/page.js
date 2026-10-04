import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ANSWER_MAX, getSurvey } from '@/lib/surveys';
import { visiblePeople } from '@/lib/surveyAccess';
import { saveSurvey } from '@/app/actions/surveys';
import { Pic } from '@/components/Avatar';
import { Name } from '@/components/Badges';
import Notice from '@/components/Notice';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const s = getSurvey(slug);
  if (!s) return { title: 'Survey not found | BFRENZ.com' };
  const title = `${s.emoji} ${s.title} survey | BFRENZ.com`;
  return {
    title,
    description: `${s.blurb} Take the "${s.title}" survey on BFRENZ and see what your frenz said.`,
    alternates: { canonical: `/surveys/${s.slug}` },
    openGraph: { title, description: s.blurb, images: ['/share.png'] },
  };
}

export default async function TakeSurveyPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const survey = getSurvey(slug);
  if (!survey) notFound();
  const me = await getCurrentUser();

  const people = await visiblePeople(me);
  const [mine, takers] = me
    ? await Promise.all([
        prisma.surveyAnswer.findUnique({ where: { surveySlug_userId: { surveySlug: survey.slug, userId: me.id } } }),
        prisma.surveyAnswer.findMany({
          where: { surveySlug: survey.slug, userId: { in: people.filter((id) => id !== me.id) }, user: { bannedAt: null } },
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, picFrame: true, nameColor: true, nameEffect: true, nameEffectsOwned: true, lifetimeSupporter: true, isOfficial: true, supporterUntil: true, bonusSupporterUntil: true } } },
        }),
      ])
    : [null, []];

  return (
    <div className="survey-take">
      <div className="small"><Link href="/surveys">&laquo; All surveys</Link></div>
      <h1 className="bigname">
        {survey.emoji} {survey.title}
      </h1>
      <p className="muted">{survey.blurb}</p>
      <Notice sp={sp} />

      {takers.length > 0 && (
        <div className="box">
          <div className="box-h">Frenz who took this ({takers.length})</div>
          <div className="survey-takers">
            {takers.map((t) => (
              <Link key={t.id} href={`/surveys/${survey.slug}/${t.user.username}`} className="survey-taker">
                <Pic user={t.user} size={44} />
                <span className="small"><Name user={t.user} /></span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <form action={saveSurvey} className="box survey-form">
        <div className="box-h">{mine ? 'Edit your answers' : 'Your answers'}</div>
        <input type="hidden" name="slug" value={survey.slug} />
        <ol className="survey-qs">
          {survey.questions.map((q, i) => (
            <li key={i}>
              <label htmlFor={`a${i}`}>{q}</label>
              <input id={`a${i}`} name={`a${i}`} maxLength={ANSWER_MAX} defaultValue={mine?.answers?.[i] || ''} autoComplete="off" disabled={!me} />
            </li>
          ))}
        </ol>
        <div className="box-b actions">
          {me ? (
            <>
              <button type="submit" className="btn">{mine ? 'Save changes' : 'Post my answers'}</button>
              <span className="small muted">Skip any you don&apos;t want to answer. {mine ? '' : 'Your frenz will see it in their feed.'}</span>
            </>
          ) : (
            <>
              <Link href="/signup" className="btn">Join free to take this survey</Link>
              <Link href="/login" className="small">or log in</Link>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
