import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getFriendIds, getTop8 } from '@/lib/friends';
import { saveTop8 } from '@/app/actions/friends';
import { FriendTile } from '@/components/Avatar';
import Notice from '@/components/Notice';

export const metadata = { title: 'Change Top 8 | BFRENZ.com' };

export default async function Top8Page({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const ids = await getFriendIds(me.id);
  const [friends, current] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, orderBy: { displayName: 'asc' } }),
    getTop8(me.id),
  ]);

  return (
    <div className="cols">
      <div className="col-right">
        <Notice sp={sp} />
        <div className="box">
          <div className="box-h">
            Pick your Top 8
            <Link href={`/${me.username}`} className="right">View profile &raquo;</Link>
          </div>
          {friends.length === 0 ? (
            <div className="box-b muted">
              You need some frenz first! <Link href="/browse">Browse people</Link>.
            </div>
          ) : (
            <form action={saveTop8} className="box-b">
              <table className="form-table">
                <tbody>
                  {Array.from({ length: 8 }, (_, i) => (
                    <tr key={i}>
                      <td className="lbl">#{i + 1}</td>
                      <td>
                        <select name={`slot${i + 1}`} defaultValue={current[i]?.id || ''} style={{ minWidth: 240 }}>
                          <option value="">— empty —</option>
                          {friends.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.displayName} (@{f.username})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td />
                    <td>
                      <button className="btn" type="submit">Save Top 8</button>
                      <div className="small muted" style={{ marginTop: 6 }}>
                        Empty slots are filled in with your other friends automatically.
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </form>
          )}
        </div>
      </div>
      <div className="col-left">
        <div className="box">
          <div className="box-h">Current Top 8</div>
          {current.length ? (
            <div className="top8" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {current.map((f) => <FriendTile key={f.id} user={f} size={60} />)}
            </div>
          ) : (
            <div className="box-b small muted">Empty for now.</div>
          )}
        </div>
      </div>
    </div>
  );
}
