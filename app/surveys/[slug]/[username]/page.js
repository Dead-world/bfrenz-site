import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { answeredPairs, getSurvey } from '@/lib/surveys';
import { canSeeAnswers } from '@/lib/surveyAccess';
import { deleteSurvey } from '@/app/actions/surveys';
import { Pic } from '@/components/Avatar';
import Badges, { Name } from '@/components/Badges';
import ShareButtons from '@/components/ShareButtons';
import { siteUrl } from '@/lib/email';
import { fmtDate } from '@/lib/util';

export const metadata = { robots: { index: false } };

export default async function SurveyAnswersPage({ params, searchParams }) {
  const { slug, username } = await params;
  const sp = await searchParams;
  const survey = getSurvey(slug);
  if (!survey) notFound();
  const owner = await prisma.user.findUnique({ where: { username: String(username).toLowerCase() } });
  if (!owner || owner.bannedAt) notFound();

  const me = await getCurrentUser();
  const isMe = me?.id === owner.id;
  const allowed = await canSeeAnswers(me, owner.id);
  const answer = allowed
    ? await prisma.surveyAnswer.findUnique({ where: { surveySlug_userId: { surveySlug: survey.slug, userId: owner.id } } })
    : null;
  const iTook = me && !isMe
    ? await prisma.surveyAnswer.findUnique({ where: { surveySlug_userId: { surveySlug: survey.slug, userId: me.id } }, select: { id: true } })
    : null;
  const back = `/surveys/${survey.slug}/${owner.username}`;

  if (!allowed) {
    return (
      <div className="survey-answers">
        <h1 className="bigname">{survey.emoji} {survey.title}</h1>
        <div className="box">
          <div className="box-b">
            <p>
              Only {owner.displayName}&apos;s frenz can see their answers.
            </p>
            <div className="actions">
              <Link href={`/surveys/${survey.slug}`} className="btn">Take this survey yourself</Link>
              <Link href={`/${owner.username}`} className="btn ghost">View {owner.displayName}&apos;s profile</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!answer) {
    return (
      <div className="survey-answers">
        <h1 className="bigname">{survey.emoji} {survey.title}</h1>
        <div className="box">
          <div className="box-b">
            <p>{isMe ? "You haven't taken this one yet." : `${owner.displayName} hasn't taken this survey yet.`}</p>
            <Link href={`/surveys/${survey.slug}`} className="btn">{isMe ? 'Take it now' : 'Take it yourself'}</Link>
          </div>
        </div>
      </div>
    );
  }

  const pairs = answeredPairs(survey, answer.answers);

  return (
    <div className="survey-answers">
      <div className="small"><Link href="/surveys">&laquo; All surveys</Link></div>
      {sp?.saved && <div className="notice ok">Posted! Your frenz can see it in their feed. 🎉</div>}

      <div className="box">
        <div className="survey-answers-head">
          <Link href={`/${owner.username}`}><Pic user={owner} size={64} /></Link>
          <div>
            <div className="small muted">{survey.emoji} {survey.title}</div>
            <h1 className="bigname" style={{ margin: '2px 0' }}>
              <Link href={`/${owner.username}`}><Name user={owner} /></Link>
              <Badges user={owner} />
            </h1>
            <div className="small muted">answered {fmtDate(answer.createdAt)}</div>
          </div>
        </div>
        <dl className="survey-qa">
          {pairs.map(([q, a], i) => (
            <div key={i} className="survey-qa-row">
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
        <div className="box-b actions survey-answer-actions">
          {isMe ? (
            <>
              <Link href={`/surveys/${survey.slug}`} className="btn small-btn">Edit answers</Link>
              <form action={deleteSurvey}>
                <input type="hidden" name="slug" value={survey.slug} />
                <button type="submit" className="btn ghost small-btn">Delete</button>
              </form>
            </>
          ) : (
            <>
              <Link href={iTook ? `/surveys/${survey.slug}/${me.username}` : `/surveys/${survey.slug}`} className="btn small-btn">
                {iTook ? 'Compare with my answers' : 'Take it too ✍️'}
              </Link>
              <Link className="small muted" href={`/report?kind=survey&id=${answer.id}&back=${encodeURIComponent(back)}`}>Report</Link>
            </>
          )}
        </div>
      </div>

      {isMe && (
        <div className="box share-box">
          <div className="box-h">Get your frenz to take it</div>
          <div className="box-b">
            <ShareButtons url={`${siteUrl()}/surveys/${survey.slug}`} text={`I just took the "${survey.title}" survey on BFRENZ. Your turn!`} />
          </div>
        </div>
      )}
    </div>
  );
}
