import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { unblockUser } from '@/app/actions/moderation';
import { Pic } from '@/components/Avatar';

export const metadata = { title: 'Blocked Members | BFRENZ.com', robots: { index: false } };

export default async function BlockedPage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const rows = await prisma.block.findMany({
    where: { blockerId: me.id },
    orderBy: { createdAt: 'desc' },
    include: { blocked: true },
  });

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      {sp?.unblocked && <div className="notice ok">Unblocked.</div>}
      <div className="box">
        <div className="box-h">Blocked members ({rows.length})</div>
        <div className="box-b">
          <p className="small muted" style={{ marginTop: 0 }}>
            Blocked members can&apos;t message you, comment on your page, or send you friend requests.
            They aren&apos;t told that you blocked them.
          </p>
          {rows.length === 0 ? (
            <div className="muted">You haven&apos;t blocked anyone.</div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="blocked-row">
                <Pic user={r.blocked} size={44} />
                <div style={{ flex: 1 }}>
                  <Link href={`/${r.blocked.username}`}>{r.blocked.displayName}</Link>
                  <div className="small muted">@{r.blocked.username}</div>
                </div>
                <form action={unblockUser}>
                  <input type="hidden" name="userId" value={r.blockedId} />
                  <input type="hidden" name="back" value="/blocked" />
                  <button className="btn ghost small-btn" type="submit">Unblock</button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
