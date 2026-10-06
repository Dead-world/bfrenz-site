import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { merchProducts, merchCat, MERCH_CATS } from '@/lib/merch';
import { printfulConfigured } from '@/lib/printful';
import { money } from '@/lib/pricing';
import { fmtDay } from '@/lib/util';
import HeaderHeight from '@/components/HeaderHeight';

export const metadata = { title: 'BFRENZ Merch | BFRENZ.com', description: 'Official BFRENZ shirts, hoodies, hats, mugs and more.' };

const STATUS = {
  paid: 'Order received',
  sent: 'Being made 🧵',
  failed: 'Delayed (we’re on it)',
  shipped: '✅ Shipped',
  canceled: 'Canceled',
};

export default async function MerchPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const me = await getCurrentUser();
  const [products, orders] = await Promise.all([
    merchProducts(),
    me ? prisma.merchOrder.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'desc' }, take: 10 }) : [],
  ]);

  const counts = {};
  for (const p of products) counts[merchCat(p.name)] = (counts[merchCat(p.name)] || 0) + 1;
  const cats = [...MERCH_CATS.filter(([k]) => counts[k]).map(([k, label]) => [k, label]), ...(counts.more ? [['more', '✨ More']] : [])];
  const cat = cats.some(([k]) => k === sp.cat) ? sp.cat : '';
  const shown = cat ? products.filter((p) => merchCat(p.name) === cat) : products;

  return (
    <div className="merch">
      <div className="shop-hero">
        <h1>👕 BFRENZ Merch</h1>
        <p className="muted">Shirts, hoodies, hats, mugs and more. Every piece is printed when you order it, just for you.</p>
      </div>
      {cats.length > 1 && (
        <nav className="shop-nav merch-tabs" aria-label="Merch categories">
          <HeaderHeight />
          <Link href="/merch" className={`shop-cat${!cat ? ' on' : ''}`} scroll={false}>All <span className="muted">{products.length}</span></Link>
          {cats.map(([k, label]) => (
            <Link key={k} href={`/merch?cat=${k}`} className={`shop-cat${cat === k ? ' on' : ''}`} scroll={false}>{label} <span className="muted">{counts[k]}</span></Link>
          ))}
          <Link href="/shop#stickers" className="shop-cat">📦 Stickers<span className="shop-cat-go" aria-hidden="true">›</span></Link>
        </nav>
      )}
      {products.length === 0 ? (
        <div className="box"><div className="box-b muted">{printfulConfigured() ? 'New merch is dropping soon. Check back!' : 'The merch shop opens soon. Check back!'}</div></div>
      ) : (
        <div className="merch-grid">
          {shown.map((p) => (
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
