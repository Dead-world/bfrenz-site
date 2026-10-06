import Link from 'next/link';
import { prisma } from '@/lib/db';
import { startCheckout } from '@/app/actions/shop';
import { money } from '@/lib/pricing';
import { STICKERS, STICKER_MAX_QTY, STICKER_SHIPPING_CENTS, stickerStock } from '@/lib/stickers';
import { fmtDay } from '@/lib/util';

/** Real BFRENZ stickers, mailed to your door. */
export default async function StickerShop({ me, payments }) {
  const st = STICKERS[0];
  const left = await stickerStock(st.slug);
  const soldOut = left !== null && left < 1;
  const max = left === null ? STICKER_MAX_QTY : Math.min(STICKER_MAX_QTY, Math.max(left, 0));
  const orders = me ? await prisma.stickerOrder.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'desc' }, take: 5 }) : [];

  return (
    <div className="box orange" id="stickers">
      <div className="box-h">📦 Real BFRENZ Stickers</div>
      <div className="box-b sticker-shop">
        <div className="sticker-pic">
          <img src={st.img} alt="BFRENZ logo sticker" width={600} height={315} />
        </div>
        <div className="sticker-info">
          <h3 style={{ margin: '0 0 4px' }}>{st.name}</h3>
          <div className="sticker-price">{money(st.cents)} <span className="small muted">each</span></div>
          <p className="small muted" style={{ margin: '6px 0 10px' }}>
            Stick it on your laptop, phone case, water bottle or skateboard. Mailed to you
            {STICKER_SHIPPING_CENTS ? ` (${money(STICKER_SHIPPING_CENTS)} shipping per order, any amount)` : ' with free shipping'}. US only for now.
          </p>
          {left !== null && !soldOut && left <= 20 && <div className="small sticker-left">🔥 Only {left} left!</div>}
          {soldOut ? (
            <div className="notice">Sold out right now. More are on the way!</div>
          ) : !me ? (
            <Link href="/login" className="btn small-btn">Log in to order</Link>
          ) : !payments ? (
            <span className="small muted">Ordering opens soon.</span>
          ) : (
            <form action={startCheckout} className="actions sticker-form">
              <input type="hidden" name="kind" value="sticker" />
              <input type="hidden" name="back" value="/shop#stickers" />
              <select name="qtyPick" aria-label="How many" defaultValue="1">
                {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={`${st.slug}:${n}`}>
                    {n} {n === 1 ? 'sticker' : 'stickers'}: {money(n * st.cents + STICKER_SHIPPING_CENTS)}{STICKER_SHIPPING_CENTS ? ' with shipping' : ''}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn small-btn">Order stickers</button>
            </form>
          )}
          {orders.length > 0 && (
            <div className="small sticker-orders">
              <b>Your orders</b>
              {orders.map((o) => (
                <div key={o.id}>
                  {fmtDay(o.createdAt)} · {o.qty} {o.qty === 1 ? 'sticker' : 'stickers'} ·{' '}
                  {o.status === 'shipped' ? (
                    <span className="sticker-shipped">✅ Shipped{o.shippedAt ? ` ${fmtDay(o.shippedAt)}` : ''}{o.tracking ? ` · tracking ${o.tracking}` : ''}</span>
                  ) : o.status === 'refunded' ? 'Refunded' : <span className="muted">Getting ready to mail</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
