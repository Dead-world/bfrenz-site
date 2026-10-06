import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { merchProducts } from '@/lib/merch';
import { printfulConfigured } from '@/lib/printful';
import { money } from '@/lib/pricing';
import { fmtDay } from '@/lib/util';

export const metadata = { title: 'BFRENZ Merch | BFRENZ.com', description: 'Official BFRENZ shirts, hoodies, hats, mugs and more.' };

const STATUS = {
  paid: 'Order received',
  sent: 'Being made 🧵',
  failed: 'Delayed (we’re on it)',
  shipped: '✅ Shipped',
  canceled: 'Canceled',
};

export default async function MerchPage() {
  const me = await getCurrentUser();
  const [products, orders] = await Promise.all([
    merchProducts(),
    me ? prisma.merchOrder.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'desc' }, take: 10 }) : [],
  ]);

  return (
    <div className="merch">
      <div className="shop-hero">
        <h1>👕 BFRENZ Merch</h1>
        <p className="muted">Shirts, hoodies, hats, mugs and more. Every piece is printed when you order it, just for you.</p>
      </div>
      {products.length === 0 ? (
        <div className="box"><div className="box-b muted">{printfulConfigured() ? 'New merch is dropping soon. Check back!' : 'The merch shop opens soon. Check back!'}</div></div>
      ) : (
        <div className="merch-grid">
          {products.map((p) => (
            <Link key={p.id} href={`/merch/${p.id}`} className="merch-card">
              <span className="merch-img"><img src={p.img} alt="" loading="lazy" /></span>
              <b>{p.name}</b>
              <span className="merch-from">{p.variants.length > 1 && new Set(p.variants.map((v) => v.cents)).size > 1 ? 'from ' : ''}{money(p.from)}</span>
            </Link>
          ))}
        </div>
      )}
      {orders.length > 0 && (
        <div className="box" id="orders">
          <div className="box-h">📦 Your merch orders</div>
          <div className="box-b small merch-orders">
            {orders.map((o) => (
              <div key={o.id}>
                {fmtDay(o.createdAt)} · {o.qty} × {o.name} · <span className={o.status === 'shipped' ? 'sticker-shipped' : 'muted'}>{STATUS[o.status] || o.status}</span>
                {o.trackingUrl && /^https:\/\//.test(o.trackingUrl) ? <> · <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer">Track it</a></> : o.tracking ? ` · ${o.tracking}` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="small muted" style={{ textAlign: 'center' }}>
        Made and shipped by our print partner, Printful. Questions about an order? Message <Link href="/help">BFRENZ help</Link>.
      </p>
    </div>
  );
}
