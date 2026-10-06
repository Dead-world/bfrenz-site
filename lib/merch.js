import { pf, printfulConfigured } from './printful';
import { photosByProduct } from './merchPhotos';

/**
 * Merch made and mailed by Printful (print on demand). Products, pictures and prices
 * all come from your Printful store; anything you add there shows up here.
 */
export const MERCH_SHIPPING = { first: 599, extra: 250 }; // cents: first item, each extra item
export const MERCH_COUNTRIES = ['US'];
export const MERCH_MAX_QTY = 10;
/** Stripe tax category for clothing and other physical goods. */
export const MERCH_TAX_CODE = 'txcd_99999999';
const LIST_CACHE = 600; // seconds

export function merchShipping(qty) {
  return qty > 0 ? MERCH_SHIPPING.first + MERCH_SHIPPING.extra * (qty - 1) : 0;
}

const cents = (p) => Math.round(parseFloat(p) * 100) || 0;
const preview = (v) => v?.files?.find((f) => f.type === 'preview')?.preview_url || v?.files?.find((f) => f.preview_url)?.preview_url || v?.product?.image || '';
// Printful reports stock as a word ('active') or as a list per region; handle both.
const statuses = (v) => {
  const a = v.availability_status;
  if (!a) return [];
  if (!Array.isArray(a)) return [String(a)];
  const us = a.filter((x) => /^US/i.test(String(x.region || '')));
  return (us.length ? us : a).map((x) => String(x.status || ''));
};
const gone = (st) => /discontinued|unavailable|inactive/i.test(st);
const out = (st) => /out_of_stock/i.test(st);
const sellable = (v) => !v.is_ignored && cents(v.retail_price) > 0 && v.synced !== false && (!statuses(v).length || statuses(v).some((st) => !gone(st)));
const inStock = (v) => v.in_stock !== false && (!statuses(v).length || statuses(v).some((st) => !gone(st) && !out(st)));

/** Turns a Printful product into what the shop shows. */
function shape(r) {
  const sp = r.sync_product || {};
  const variants = (r.sync_variants || []).filter(sellable).map((v) => ({
    id: String(v.id),
    name: v.name,
    size: v.size || '',
    color: v.color || '',
    cents: cents(v.retail_price),
    img: preview(v),
    inStock: inStock(v),
  }));
  if (!variants.length) return null;
  const prices = variants.map((v) => v.cents);
  return {
    id: String(sp.id),
    name: sp.name,
    img: sp.thumbnail_url || variants[0].img,
    from: Math.min(...prices),
    variants,
  };
}

/** Puts our saved product photos (if any) in place of Printful's plain previews. */
function withPhotos(p, photos) {
  if (!p || !photos?.length) return p ? { ...p, photos: [] } : p;
  const forColor = (c) => photos.filter((x) => !x.color || x.color === c);
  const main = (c) => forColor(c)[0]?.url;
  return {
    ...p,
    img: main(p.variants[0].color) || photos[0].url,
    photos,
    variants: p.variants.map((v) => ({ ...v, img: main(v.color) || v.img })),
  };
}

/** Every product in your Printful store that has a price. Never throws (shows nothing instead). */
export async function merchProducts() {
  if (!printfulConfigured()) return [];
  try {
    const list = await pf('GET', '/store/products?limit=100', null, { cache: LIST_CACHE });
    const full = await Promise.all(
      (list || []).filter((p) => !p.is_ignored).map((p) => pf('GET', `/store/products/${p.id}`, null, { cache: LIST_CACHE }).catch(() => null)),
    );
    const items = full.filter(Boolean).map(shape).filter(Boolean);
    const photos = await photosByProduct(items.map((p) => p.id));
    return items.map((p) => withPhotos(p, photos[p.id]));
  } catch (err) {
    console.error('[merch] product list failed:', err?.message);
    return [];
  }
}

export async function merchProduct(id) {
  if (!printfulConfigured() || !/^\d{1,15}$/.test(String(id))) return null;
  try {
    const p = shape(await pf('GET', `/store/products/${id}`, null, { cache: LIST_CACHE }));
    if (!p) return null;
    const photos = await photosByProduct([p.id]);
    return withPhotos(p, photos[p.id]);
  } catch {
    return null;
  }
}

/** One variant, always fresh from Printful (used at checkout so the price can't be faked). */
export async function merchVariant(id) {
  if (!printfulConfigured() || !/^\d{1,15}$/.test(String(id))) return null;
  try {
    const v = await pf('GET', `/store/variants/${id}`);
    if (!v || !sellable(v)) return null;
    return { id: String(v.id), name: v.name, cents: cents(v.retail_price), img: preview(v), inStock: inStock(v), productId: String(v.sync_product_id || '') };
  } catch (err) {
    console.error('[merch] variant lookup failed:', err?.message);
    return null;
  }
}
