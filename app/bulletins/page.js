import Link from 'next/link';
import RichTextarea from '@/components/RichTextarea';
import { requireUser } from '@/lib/auth';
import { getFriendIds } from '@/lib/friends';
import { postBulletin } from '@/app/actions/social';
import Notice from '@/components/Notice';
import { fmtDate } from '@/lib/util';
import { bulletinsFor } from '@/lib/featured';

export const metadata = { title: 'Bulletins | BFRENZ.com' };

export default async function BulletinsPage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const friendIds = await getFriendIds(me.id);
  const bulletins = await bulletinsFor(me.id, friendIds, 50);

  return (
    <div className="cols">
      <div className="col-right">
        <Notice sp={sp} />
        <div className="box">
          <div className="box-h">
            Bulletin Board
            <Link href="/bulletins?post=1#post" className="right">+ Post bulletin</Link>
          </div>
          {bulletins.length === 0 ? (
            <div className="box-b muted">No bulletins from your frenz yet.</div>
          ) : (
            <table className="list">
              <thead>
                <tr><th>From</th><th>Date</th><th>Bulletin</th></tr>
              </thead>
              <tbody>
                {bulletins.map((b) => (
                  <tr key={b.id}>
                    <td><Link href={`/${b.author.username}`}>{b.author.displayName}</Link></td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(b.createdAt)}</td>
                    <td>
                      {b._sponsored && <span className="sponsored-tag">Sponsored</span>}
                      <Link href={`/bulletins/${b.id}`}>{b.subject}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div className="col-left">
        <form action={postBulletin} className="box orange" id="post">
          <div className="box-h orange">Post a bulletin</div>
          <div className="box-b stack">
            <div className="small muted">Goes out to all {friendIds.length} of your frenz.</div>
            <input type="text" name="subject" placeholder="Subject" maxLength={120} required />
            <RichTextarea rows={8} placeholder="What's up? (HTML welcome)" maxLength={10000} required />
            <div><button className="btn" type="submit">Post</button></div>
          </div>
        </form>
      </div>
    </div>
  );
}
