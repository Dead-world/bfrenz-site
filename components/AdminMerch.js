import { prisma } from '@/lib/db';
import { retryMerchOrder, checkMerchOrder, refreshMerch, connectPrintfulWebhook, makeStarterMerch, makeMerchPhotosNow } from '@/app/actions/merchAdmin';
import { STARTER } from '@/lib/merchStarter';
import { printfulConfigured, pf } from '@/lib/printful';
import { merchProducts } from '@/lib/merch';
import { money } from '@/lib/pricing';
import { fmtDate } from '@/lib/util';

const STATUS = { paid: '⏳ Paid', sent: '🧵 At Printful', failed: '⚠️ Didn’t reach Printful', shipped: '✅ Shipped', canceled: '✖ Canceled' };

/** Admin tab: Printful setup and merch orders. */
export default async function AdminMerch({ msg = '', error = '', show = 'open' }) {
  const on = printfulConfigured();
  let store = null;
  let storeErr = '';
  if (on) {
    // Checks the key with the same permission the shop uses (store products), so no extra scopes are needed.
    try {
      await pf('GET', '/store/products?limit=1');
      store = await pf('GET', '/store').catch(() => ({ name: '' }));
    } catch (err) {
      storeErr = String(err?.message || err).slice(0, 300);
    }
  }
  const [products, orders] = await Promise.all([
    on ? merchProducts() : [],
    prisma.merchOrder.findMany({
      where: show === 'all' ? {} : { status: { in: ['paid', 'sent', 'failed'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { username: true } } },
    }),
  ]);
  const step = (ok, text) => <li className={ok ? 'ok' : ''}>{ok ? '✅' : '⬜'} {text}</li>;

  return (
    <>
      {msg && <div className="notice ok">{msg}</div>}
      {error && <div className="notice error">{error}</div>}
      <div className="box">
        <div className="box-h">👕 Merch setup (Printful)</div>
        <div className="box-b small">
          <ol className="merch-steps">
            {step(on, <>Add <code>PRINTFUL_API_KEY</code> in Vercel (Settings → Environment Variables), then redeploy.</>)}
            {on && step(!!store && !storeErr, store ? <>Connected to Printful{store.name ? <> store <b>{store.name}</b></> : ''}.</> : <>Couldn&apos;t reach Printful: {storeErr || 'unknown error'}. {/scope/i.test(storeErr) ? <> Make a new token at developers.printful.com with <b>all scopes</b> checked (or at least store products, orders, webhooks and file library), put it in <code>PRINTFUL_API_KEY</code>, and redeploy.</> : <> If your token is for the whole account, also add <code>PRINTFUL_STORE_ID</code>.</>}</>)}
            {on && step(products.length > 0, products.length ? <>{products.length} {products.length === 1 ? 'product is' : 'products are'} live on <a href="/merch">/merch</a>.</> : 'Create products in Printful (with a retail price), then tap Refresh.')}
          </ol>
          {on && store && (
            <form action={makeStarterMerch} className="merch-starter">
              <b>✨ Create starter merch</b>
              <span className="muted">
                Makes {STARTER.map((x) => x.name).join(', ')} in your Printful store with the BFRENZ designs and prices already set. Products you already have are skipped.
                It takes up to a minute.
              </span>
              <button className="btn small-btn" type="submit">Create starter merch</button>
            </form>
          )}
          {on && (
            <div className="actions">
              <form action={makeMerchPhotosNow}><button className="btn small-btn" type="submit">📸 Make product photos</button></form>
              <form action={makeMerchPhotosNow}><input type="hidden" name="redo" value="1" /><button className="btn ghost small-btn" type="submit">Redo all photos</button></form>
              <form action={refreshMerch}><button className="btn ghost small-btn" type="submit">🔄 Refresh products</button></form>
              <form action={connectPrintfulWebhook}><button className="btn ghost small-btn" type="submit">📬 Turn on shipping updates</button></form>
            </div>
          )}
          <p className="muted" style={{ marginBottom: 0 }}>
            When someone buys, the order goes to Printful automatically and Printful charges the card on your Printful account for the cost. You keep the difference.
          </p>
        </div>
      </div>

      <div className="box">
        <div className="box-h">📦 {show === 'all' ? 'All merch orders' : 'Open merch orders'}</div>
        <div className="box-b small">
          <div style={{ marginBottom: 8 }}>
            {show === 'all' ? <a href="/admin?tab=merch">Show only open orders</a> : <a href="/admin?tab=merch&show=all">Show all orders</a>}
          </div>
          {orders.length === 0 ? (
            <p className="muted">{show === 'all' ? 'No merch orders yet.' : 'No open orders. 🎉'}</p>
          ) : (
            <table className="admin-orders">
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <b>{o.qty} × {o.name}</b>
                      <div className="muted">{fmtDate(o.createdAt)} · paid {money(o.amountCents)} · @{o.user?.username}</div>
                      <div className="muted">{[o.shipName, o.city && `${o.city}, ${o.state}`].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td>
                      <div>{STATUS[o.status] || o.status}{o.tracking ? ` · ${o.tracking}` : ''}</div>
                      {o.error && o.status === 'failed' && <div className="gift-err">{o.error}</div>}
                    </td>
                    <td>
                      {o.status === 'failed' || o.status === 'paid' ? (
                        <form action={retryMerchOrder}><input type="hidden" name="id" value={o.id} /><button className="btn small-btn" type="submit">Retry</button></form>
                      ) : o.status === 'sent' ? (
                        <form action={checkMerchOrder}><input type="hidden" name="id" value={o.id} /><button className="linkbtn small" type="submit">Check status</button></form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted" style={{ marginBottom: 0 }}>Refunds: refund the payment in Stripe, and cancel the order in Printful if it hasn&apos;t shipped.</p>
        </div>
      </div>
    </>
  );
}
