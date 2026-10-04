import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { SURVEYS, getSurvey, nextSurveyAt, weeklySurvey } from '@/lib/surveys';
import { visiblePeople } from '@/lib/surveyAccess';
import { Pic } from '@/components/Avatar';
import { Name } from '@/components/Badges';
import Notice from '@/components/Notice';
import { timeAgo } from '@/lib/util';

export const metadata = {
  title: 'Surveys | BFRENZ.com',
  description: 'Old-school surveys. Answer, share with your frenz, see what they said.',
  alternates: { canonical: '/surveys' },
};

export default async function SurveysPage({ searchParams }) {
  const sp = await searchParams;
  const me = await getCurrentUser();
  const weekly = weeklySurvey();
  const people = await visiblePeople(me);

  const [mine, recent] = me
    ? await Promise.all([
        prisma.surveyAnswer.findMany({ where: { userId: me.id }, select: { surveySlug: true } }),
        prisma.surveyAnswer.findMany({
          where: { userId: { in: people.filter((id) => id !== me.id) }, user: { bannedAt: null } },
          orderBy: { createdAt: 'desc' },
          take: 12,
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, picFrame: true, nameColor: true, nameEffect: true, nameEffectsOwned: true, lifetimeSupporter: true, isOfficial: true, supporterUntil: true, bonusSupporterUntil: true } } },
        }),
      ])
    : [[], []];
  const done = new Set(mine.map((m) => m.surveySlug));
  const days = Math.max(1, Math.ceil((nextSurveyAt() - Date.now()) / (24 * 60 * 60 * 1000)));

  return (
    <div className="surveys-page">
      <h1 className="bigname">Surveys 📝</h1>
      <Notice sp={sp} />
      {sp?.deleted && <div className="notice ok">Your answers were deleted.</div>}

      <div className="box orange survey-hero">
        <div className="box-h orange">
          This week&apos;s survey
          <span className="right small">new one in {days} {days === 1 ? 'day' : 'days'}</span>
        </div>
        <div className="box-b">
          <div className="survey-hero-title">
            <span className="survey-emoji">{weekly.emoji}</span> {weekly.title}
          </div>
          <p className="muted">{weekly.blurb} · {weekly.questions.length} questions</p>
          {me && done.has(weekly.slug) ? (
            <div className="actions">
              <Link href={`/surveys/${weekly.slug}/${me.username}`} className="btn">See my answers</Link>
              <Link href={`/surveys/${weekly.slug}`} className="btn ghost">Edit</Link>
            </div>
          ) : (
            <Link href={`/surveys/${weekly.slug}`} className="btn">Take it now &raquo;</Link>
          )}
        </div>
      </div>

      <div className="cols">
        <div className="col-right" style={{ order: 0 }}>
          <div className="box">
            <div className="box-h">All surveys</div>
            <div className="survey-grid">
              {SURVEYS.map((s) => (
                <Link key={s.slug} href={me && done.has(s.slug) ? `/surveys/${s.slug}/${me.username}` : `/surveys/${s.slug}`} className="survey-tile">
                  <span className="survey-emoji">{s.emoji}</span>
                  <b>{s.title}</b>
                  <span className="small muted">{s.blurb}</span>
                  <span className="small">
                    {me && done.has(s.slug) ? <span className="survey-done">✓ Taken</span> : `${s.questions.length} questions`}
                    {s.slug === weekly.slug && <span className="sponsored-tag" style={{ marginLeft: 6 }}>This week</span>}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="col-left">
          <div className="box">
            <div className="box-h">Frenz who answered</div>
            <div className="box-b small">
              {!me ? (
                <><Link href="/signup">Join BFRENZ</Link> to take surveys and see your frenz&apos; answers.</>
              ) : recent.length === 0 ? (
                <>None of your frenz have taken a survey yet. Take one and they&apos;ll see it in their feed!</>
              ) : (
                <ul className="survey-recent">
                  {recent.map((r) => {
                    const s = getSurvey(r.surveySlug);
                    if (!s) return null;
                    return (
                      <li key={r.id}>
                        <Link href={`/${r.user.username}`}><Pic user={r.user} size={32} /></Link>
                        <span>
                          <Link href={`/${r.user.username}`}><Name user={r.user} /></Link> took{' '}
                          <Link href={`/surveys/${s.slug}/${r.user.username}`}>{s.title}</Link>
                          <span className="muted"> · {timeAgo(r.createdAt)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
