import { prisma } from '@/lib/db';
import { markStickerShipped, setStickerStock } from '@/app/actions/stickers';
import { money } from '@/lib/pricing';
import { STICKERS, getSticker, stickerStock } from '@/lib/stickers';
import { fmtDate } from '@/lib/util';

/** Admin tab: sticker orders to mail, and how many stickers are left. */
export default async function AdminStickers({ show = 'todo', msg = '' }) {
  const where = show === 'all' ? {} : { status: 'paid' };
  const [orders, todo, stock] = await Promise.all([
    prisma.stickerOrder.findMany({ where, orderBy: { createdAt: show === 'all' ? 'desc' : 'asc' }, take: 100, include: { user: { select: { username: true, displayName: true } } } }),
    prisma.stickerOrder.aggregate({ where: { status: 'paid' }, _count: { _all: true }, _sum: { qty: true } }),
    Promise.all(STICKERS.map(async (s) => [s, await stickerStock(s.slug)])),
  ]);

  return (
    <>
      {msg && <div className="notice ok">{msg}</div>}
      <div className="box">
        <div className="box-h">📦 Stickers on hand</div>
        <div className="box-b small">
          {stock.map(([s, left]) => (
            <form key={s.slug} action={setStickerStock} className="actions">
              <input type="hidden" name="slug" value={s.slug} />
              <b>{s.name}</b>
              <input type="number" name="stock" min="0" step="1" defaultValue={left ?? ''} placeholder="not tracked" style={{ width: 120 }} aria-label="Stickers on hand" />
              <button type="submit" className="btn small-btn">Save</button>
              <span className="muted">
                {left === null ? 'Not tracked, so it never sells out.' : `${left} left. It goes down by itself with each order and shows "Sold out" at 0.`}
              </span>
            </form>
          ))}
        </div>
      </div>

      <div className="box">
        <div className="box-h">
          ✉️ {show === 'all' ? 'All sticker orders' : `To mail: ${todo._count._all} ${todo._count._all === 1 ? 'order' : 'orders'} (${todo._sum.qty || 0} stickers)`}
        </div>
        <div className="box-b small">
          <div style={{ marginBottom: 8 }}>
            {show === 'all' ? <a href="/admin?tab=stickers">Show only orders to mail</a> : <a href="/admin?tab=stickers&show=all">Show all orders</a>}
          </div>
          {orders.length === 0 ? (
            <p className="muted">{show === 'all' ? 'No sticker orders yet.' : 'Nothing to mail right now. 🎉'}</p>
          ) : (
            <table className="admin-orders">
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className={o.status === 'shipped' ? 'shipped' : ''}>
                    <td>
                      <b>{o.qty} × {getSticker(o.slug)?.name || o.slug}</b>
                      <div className="muted">{fmtDate(o.createdAt)} · paid {money(o.amountCents)}</div>
                      <div>@{o.user?.username}</div>
                    </td>
                    <td>
                      <address>{[o.shipName, o.line1, o.line2, `${o.city}, ${o.state} ${o.postal}`, o.country !== 'US' ? o.country : ''].filter(Boolean).join('\n')}</address>
                    </td>
                    <td>
                      {o.status === 'shipped' ? (
                        <form action={markStickerShipped}>
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="undo" value="1" />
                          ✅ Shipped {o.shippedAt ? fmtDate(o.shippedAt) : ''}{o.tracking ? ` · ${o.tracking}` : ''}{' '}
                          <button type="submit" className="linkbtn small">Undo</button>
                        </form>
                      ) : (
                        <form action={markStickerShipped} className="actions">
                          <input type="hidden" name="id" value={o.id} />
                          <input name="tracking" placeholder="Tracking # (optional)" maxLength={60} style={{ width: 170 }} aria-label="Tracking number" />
                          <button type="submit" className="btn small-btn">Mark shipped</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted" style={{ marginBottom: 0 }}>
            Refunds: open the payment in your Stripe dashboard and refund it there. Customers&apos; addresses are private, so only use them to mail orders.
          </p>
        </div>
      </div>
    </>
  );
}
