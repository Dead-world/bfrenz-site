import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { areFriends } from '@/lib/friends';
import { cleanHtml } from '@/lib/sanitize';
import { deleteBulletin } from '@/app/actions/social';
import { Pic } from '@/components/Avatar';
import { fmtDate } from '@/lib/util';

export const metadata = { title: 'Bulletin | BFRENZ.com' };

export default async function BulletinPage({ params }) {
  const me = await requireUser();
  const { id } = await params;
  const b = await prisma.bulletin.findUnique({ where: { id }, include: { author: true } });
  if (!b) notFound();
  const mine = b.authorId === me.id;
  if (!mine && !(await areFriends(me.id, b.authorId))) notFound();

  return (
    <div className="box">
      <div className="box-h">
        {b.subject}
        <Link href="/bulletins" className="right">&laquo; All bulletins</Link>
      </div>
      <table className="comments">
        <tbody>
          <tr>
            <td className="who">
              <Link href={`/${b.author.username}`}>{b.author.displayName}</Link>
              <Link href={`/${b.author.username}`}><Pic user={b.author} size={72} /></Link>
            </td>
            <td className="said">
              <div className="when">{fmtDate(b.createdAt)}</div>
              <div dangerouslySetInnerHTML={{ __html: cleanHtml(b.body) }} />
              <div className="actions" style={{ marginTop: 14 }}>
                {!mine && (
                  <Link
                    href={`/mail/compose?to=${b.author.username}&subject=${encodeURIComponent('RE: ' + b.subject)}`}
                    className="btn small-btn"
                  >
                    Reply to {b.author.displayName}
                  </Link>
                )}
                {mine && (
                  <form action={deleteBulletin}>
                    <input type="hidden" name="id" value={b.id} />
                    <button type="submit" className="btn ghost small-btn">Delete bulletin</button>
                  </form>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
