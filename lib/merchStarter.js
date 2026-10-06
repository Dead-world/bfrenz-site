import { pf } from './printful';
import { siteUrl } from './email';

/**
 * The starter BFRENZ merch line. The admin "Create starter merch" button makes these
 * in your Printful store (skipping any you already have, so it's safe to tap again).
 * Prices are what customers pay; change them anytime in Printful.
 */
const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const BIG = ['2XL', '3XL'];
const tee = { find: (p) => /\b3001\b/.test(`${p.model} ${p.title}`) && /bella/i.test(`${p.brand} ${p.title}`), label: 'Bella+Canvas 3001 tee' };
const hoodie = { find: (p) => /\b18500\b/.test(`${p.model} ${p.title}`), label: 'Gildan 18500 hoodie' };

export const STARTER = [
  { name: 'BFRENZ Logo Tee', ...tee, sizes: SIZES, colors: { Black: 'tee-logo-dark.png', White: 'tee-logo-light.png' }, price: 2499, bigPrice: 2799 },
  { name: 'BFRENZ 4 LIFE Tee', ...tee, sizes: SIZES, colors: { Black: 'tee-4life-dark.png', White: 'tee-4life-light.png' }, price: 2499, bigPrice: 2799 },
  { name: 'Thanks For The Add Tee', ...tee, sizes: SIZES, colors: { Black: 'tee-thanks-for-the-add.png' }, price: 2499, bigPrice: 2799 },
  { name: 'Top 8 Material Tee', ...tee, sizes: SIZES, colors: { Black: 'tee-top8-material.png' }, price: 2499, bigPrice: 2799 },
  { name: 'BFRENZ Logo Hoodie', ...hoodie, sizes: SIZES, colors: { Black: 'hoodie-logo-dark.png' }, price: 4499, bigPrice: 4799 },
  {
    name: 'BFRENZ Dad Hat', label: 'Yupoong 6245CM dad hat', find: (p) => /6245CM/i.test(`${p.model} ${p.title}`),
    colors: { Black: 'hat-logo.png' }, price: 2499, embroidery: true,
  },
  {
    name: 'BFRENZ Mug', label: 'White glossy mug', find: (p) => /white glossy mug/i.test(p.title || ''),
    sizes: ['11 oz', '11oz'], colors: { '*': 'mug.png' }, price: 1599,
  },
  {
    name: 'BFRENZ Phone Case', label: 'Tough case for iPhone', find: (p) => /tough case for iphone/i.test(p.title || ''),
    colors: { '*': 'phone-case.png' }, price: 2499, sizeMatch: (s) => /iphone 1[3-7]/i.test(s),
  },
];

const PLACEMENTS = ['front', 'default', 'embroidery_front_large', 'embroidery_front'];
/** Catalog stock is a list per region ([{region:'US', status:'in_stock'}]); older answers used a word. */
function available(v) {
  if (v.in_stock === false) return false;
  const bad = (st) => /discontinued|out_of_stock|unavailable/i.test(String(st || ''));
  const a = v.availability_status;
  if (Array.isArray(a)) {
    if (!a.length) return true;
    const us = a.filter((x) => /^US/i.test(String(x.region || '')));
    return (us.length ? us : a).some((x) => !bad(x.status));
  }
  return !bad(a);
}
const sameColor = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

function pickVariants(item, variants) {
  const out = [];
  for (const v of variants) {
    if (!available(v)) continue;
    const colorKey = Object.keys(item.colors).find((c) => c === '*' || sameColor(c, v.color));
    if (!colorKey) continue;
    const size = String(v.size || '');
    if (item.sizes && !item.sizes.some((s) => sameColor(s, size))) continue;
    if (item.sizeMatch && !item.sizeMatch(`${size} ${v.name || ''}`)) continue;
    out.push({ v, file: item.colors[colorKey], cents: item.bigPrice && BIG.includes(size.toUpperCase()) ? item.bigPrice : item.price });
  }
  return out;
}

/** Creates the starter line. Stops early if time runs short (tap again to finish). Returns a summary per product. */
export async function createStarterMerch({ budgetMs = 45000 } = {}) {
  const start = Date.now();
  const base = siteUrl().replace(/\/$/, '');
  const results = [];
  const have = new Set(((await pf('GET', '/store/products?limit=100')) || []).map((p) => String(p.name).trim().toLowerCase()));
  const catalog = (await pf('GET', '/products')) || [];

  for (const item of STARTER) {
    if (have.has(item.name.toLowerCase())) { results.push({ name: item.name, status: 'exists' }); continue; }
    if (Date.now() - start > budgetMs) { results.push({ name: item.name, status: 'later' }); continue; }
    try {
      const cat = catalog.find(item.find);
      if (!cat) throw new Error(`couldn't find the ${item.label} in Printful's catalog`);
      const info = await pf('GET', `/products/${cat.id}`);
      const placements = (info?.product?.files || []).map((f) => f.type);
      const type = PLACEMENTS.find((t) => placements.includes(t)) || placements[0] || 'default';
      const picked = pickVariants(item, info?.variants || []);
      if (!picked.length) {
        const vs = info?.variants || [];
        const seen = (k) => [...new Set(vs.map((v) => v[k]).filter(Boolean))].slice(0, 8).join('/');
        throw new Error(`no matching colors/sizes in stock for the ${item.label} (Printful has ${vs.length} variants; colors ${seen('color') || '?'}; sizes ${seen('size') || '?'})`);
      }
      const body = (extra) => ({
        sync_product: { name: item.name },
        sync_variants: picked.map(({ v, file, cents }) => ({
          variant_id: v.id,
          retail_price: (cents / 100).toFixed(2),
          files: [{ type, url: `${base}/merch-designs/${file}` }],
          ...(extra ? { options: extra } : {}),
        })),
      });
      try {
        await pf('POST', '/store/products', body(null));
      } catch (err) {
        // Embroidery sometimes needs thread colors spelled out: orange + black.
        if (!item.embroidery) throw err;
        const key = type.startsWith('embroidery_') ? `thread_colors_${type.replace('embroidery_', '')}` : 'thread_colors';
        await pf('POST', '/store/products', body([{ id: key, value: ['#E25C27', '#000000'] }]));
      }
      results.push({ name: item.name, status: 'made', count: picked.length });
    } catch (err) {
      results.push({ name: item.name, status: 'failed', error: String(err?.message || err).slice(0, 200) });
    }
  }
  return results;
}
