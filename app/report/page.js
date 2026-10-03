import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { REPORT_KINDS, REPORT_REASONS } from '@/lib/moderation';
import { submitReport } from '@/app/actions/moderation';
import { safeBack } from '@/lib/util';
import Notice from '@/components/Notice';

export const metadata = { title: 'Report | BFRENZ.com', robots: { index: false } };

const WHAT = {
  profile: 'this profile',
  comment: 'this comment',
  bulletin: 'this bulletin',
  message: 'this message',
  photo: 'this photo',
  video: 'this video',
  post: 'this post',
  postcomment: 'this comment',
  survey: 'these survey answers',
  blog: 'this blog entry',
  blogcomment: 'this comment',
  group: 'this group',
  grouppost: 'this group post',
  live: 'this live stream',
  groupreply: 'this reply',
};

export default async function ReportPage({ searchParams }) {
  await requireUser();
  const sp = await searchParams;
  const kind = REPORT_KINDS.includes(String(sp?.kind)) ? String(sp.kind) : null;
  const id = String(sp?.id || '').slice(0, 40);
  const back = safeBack(sp?.back, '/home');

  if (!kind || !id) {
    return <div className="box"><div className="box-b">Nothing to report. <Link href={back}>Go back</Link></div></div>;
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <Notice sp={sp} />
      <form action={submitReport} className="box">
        <div className="box-h">Report {WHAT[kind]}</div>
        <div className="box-b">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="back" value={back} />
          <p className="small muted" style={{ marginTop: 0 }}>
            Reports are private. The person won&apos;t know who reported them. Our team reviews every one.
          </p>
          <div className="report-reasons">
            {REPORT_REASONS.map(([key, label]) => (
              <label key={key}>
                <input type="radio" name="reason" value={key} required /> {label}
              </label>
            ))}
          </div>
          <label className="small" htmlFor="details" style={{ display: 'block', margin: '14px 0 6px' }}>
            Anything else we should know? (optional)
          </label>
          <textarea id="details" name="details" rows={4} maxLength={2000} />
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="btn" type="submit">Send report</button>
            <Link href={back} className="btn ghost">Cancel</Link>
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            If someone is in danger right now, contact local emergency services first.
          </p>
        </div>
      </form>
    </div>
  );
}
