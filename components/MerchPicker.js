'use client';

import { useMemo, useState } from 'react';
import { startCheckout } from '@/app/actions/shop';

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', '4XL', '5XL'];
const sizeRank = (s) => { const i = SIZE_ORDER.indexOf(String(s).toUpperCase()); return i === -1 ? 99 : i; };
const money = (c) => `$${(c / 100).toFixed(2)}`;

/** Color + size + quantity for one product, then off to checkout. */
export default function MerchPicker({ product, shipping, maxQty = 10, canBuy = true, signInHref = '/login' }) {
  const vs = product.variants;
  const colors = useMemo(() => [...new Set(vs.map((v) => v.color).filter(Boolean))], [vs]);
  const [color, setColor] = useState(colors[0] || '');
  const sizes = useMemo(
    () => [...new Set(vs.filter((v) => !color || v.color === color).map((v) => v.size).filter(Boolean))].sort((a, b) => sizeRank(a) - sizeRank(b)),
    [vs, color],
  );
  const [size, setSize] = useState('');
  const pickSize = sizes.includes(size) ? size : sizes.find((s) => vs.some((v) => v.size === s && (!color || v.color === color) && v.inStock)) || sizes[0] || '';
  const v = vs.find((x) => (!color || x.color === color) && (!pickSize || x.size === pickSize)) || vs[0];
  const [qty, setQty] = useState(1);
  const shots = (product.photos || []).filter((x) => !x.color || !color || x.color === color);
  const [shot, setShot] = useState(0);
  const mainImg = shots[shot]?.url || v.img || product.img;
  const [busy, setBusy] = useState(false);
  const ship = shipping.first + shipping.extra * (qty - 1);

  return (
    <div className="merch-detail">
      <div className="merch-gallery">
        <div className="merch-big">
          <img src={mainImg} alt={product.name} />
        </div>
        {shots.length > 1 && (
          <div className="merch-thumbs">
            {shots.map((x, i) => (
              <button key={x.url} type="button" className={`merch-thumb${i === shot ? ' on' : ''}`} onClick={() => setShot(i)} aria-label={x.title || `Photo ${i + 1}`}>
                <img src={x.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="merch-opts">
        <h1 className="merch-title">{product.name}</h1>
        <div className="merch-price">{money(v.cents)}</div>
        {colors.length > 1 && (
          <div className="merch-row">
            <span className="small muted">Color: <b>{color}</b></span>
            <div className="merch-chips">
              {colors.map((c) => (
                <button key={c} type="button" className={`merch-chip${c === color ? ' on' : ''}`} onClick={() => { setColor(c); setShot(0); }}>{c}</button>
              ))}
            </div>
          </div>
        )}
        {sizes.length > 0 && (
          <div className="merch-row">
            <span className="small muted">Size</span>
            <div className="merch-chips">
              {sizes.map((s) => {
                const out = !vs.some((x) => x.size === s && (!color || x.color === color) && x.inStock);
                return (
                  <button key={s} type="button" disabled={out} className={`merch-chip size${s === pickSize ? ' on' : ''}`} onClick={() => setSize(s)} title={out ? 'Out of stock' : ''}>{s}</button>
                );
              })}
            </div>
          </div>
        )}
        <div className="merch-row">
          <span className="small muted">How many</span>
          <select value={qty} onChange={(e) => setQty(Number(e.target.value))} aria-label="How many">
            {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="small muted merch-total">
          {money(v.cents * qty)} + {money(ship)} shipping = <b style={{ color: 'var(--text, #fff)' }}>{money(v.cents * qty + ship)}</b>
        </div>
        {canBuy ? (
          <form action={startCheckout} onSubmit={() => setBusy(true)}>
            <input type="hidden" name="kind" value="merch" />
            <input type="hidden" name="itemId" value={`${v.id}:${qty}`} />
            <input type="hidden" name="back" value={`/merch/${product.id}?src=merch`} />
            <button type="submit" className="btn merch-buy" disabled={busy || !v.inStock}>
              {!v.inStock ? 'Out of stock' : busy ? 'Opening checkout…' : 'Buy now'}
            </button>
          </form>
        ) : (
          <a href={signInHref} className="btn merch-buy">Log in to buy</a>
        )}
        <p className="small muted" style={{ marginBottom: 0 }}>
          Printed just for you and mailed in about 5 to 12 business days (US only for now). You&apos;ll get a notification with tracking when it ships.
        </p>
      </div>
    </div>
  );
}
