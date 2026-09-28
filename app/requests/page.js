import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { respondToRequest, cancelRequest } from '@/app/actions/friends';
import { Pic } from '@/components/Avatar';
import { fmtDate } from '@/lib/util';

export const metadata = { title: 'Friend Requests | BFRENZ.com' };

export default async function RequestsPage() {
  const me = await requireUser();
  const [incoming, outgoing] = await Promise.all([
    prisma.friendship.findMany({
      where: { addresseeId: me.id, status: 'PENDING' },
      include: { requester: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendship.findMany({
      where: { requesterId: me.id, status: 'PENDING' },
      include: { addressee: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <div className="cols">
      <div className="col-right">
        <div className="box">
          <div className="box-h">Friend Requests ({incoming.length})</div>
          {incoming.length === 0 ? (
            <div className="box-b muted">No new requests.</div>
          ) : (
            <table className="list">
              <tbody>
                {incoming.map((r) => (
                  <tr key={r.id}>
                    <td style={{ width: 80 }}>
                      <Link href={`/${r.requester.username}`}><Pic user={r.requester} size={64} /></Link>
                    </td>
                    <td>
                      <Link href={`/${r.requester.username}`}><b>{r.requester.displayName}</b></Link>
                      <div className="small muted">{r.requester.location}</div>
                      <div className="small muted">{fmtDate(r.createdAt)}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions" style={{ justifyContent: 'flex-end' }}>
                        <form action={respondToRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="accept" value="1" />
                          <button className="btn small-btn" type="submit">Approve</button>
                        </form>
                        <form action={respondToRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="accept" value="0" />
                          <button className="btn ghost small-btn" type="submit">Deny</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div className="col-left">
        <div className="box">
          <div className="box-h">Requests you sent</div>
          {outgoing.length === 0 ? (
            <div className="box-b small muted">None pending.</div>
          ) : (
            <table className="list">
              <tbody>
                {outgoing.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/${r.addressee.username}`}>{r.addressee.displayName}</Link>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <form action={cancelRequest}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="linkbtn small" type="submit">Cancel</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
