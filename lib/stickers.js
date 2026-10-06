import { prisma } from './db';

/**
 * Real stickers, mailed by the site owner. Paid through a normal Stripe checkout
 * (not Managed Payments, which only allows digital items) that collects a US shipping address.
 */
export const STICKERS = [
  { slug: 'bfrenz-logo', name: 'BFRENZ logo sticker', img: '/stickers/bfrenz-logo.png', cents: 200 },
];
export const STICKER_SHIPPING_CENTS = 100; // flat, per order (one envelope + stamp)
export const STICKER_MAX_QTY = 10;
export const STICKER_COUNTRIES = ['US'];
/** Stripe tax category for physical goods ("General - Tangible Goods"). */
export const STICKER_TAX_CODE = 'txcd_99999999';

export function getSticker(slug) {
  return STICKERS.find((s) => s.slug === slug) || null;
}

/** How many are left, or null when the owner isn't tracking stock. */
export async function stickerStock(slug) {
  const row = await prisma.shopStock.findUnique({ where: { slug } }).catch(() => null);
  return row ? row.stock : null;
}

/** Shipping address from a Checkout Session (its location moved between Stripe API versions). */
export function shippingFrom(session) {
  const sd = session?.collected_information?.shipping_details || session?.shipping_details || session?.shipping || null;
  const a = sd?.address || {};
  return {
    shipName: String(sd?.name || session?.customer_details?.name || '').slice(0, 120),
    line1: String(a.line1 || '').slice(0, 200),
    line2: String(a.line2 || '').slice(0, 200),
    city: String(a.city || '').slice(0, 100),
    state: String(a.state || '').slice(0, 50),
    postal: String(a.postal_code || '').slice(0, 20),
    country: String(a.country || 'US').slice(0, 2),
  };
}
