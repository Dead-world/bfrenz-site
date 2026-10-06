import { put } from '@vercel/blob';
import { prisma } from './db';
import { pf } from './printful';

/**
 * Real product photos from Printful's mockup generator (your design on the actual shirt,
 * on models, flat lays and lifestyle shots). Printful's links expire, so we copy each
 * photo into the site's Blob storage and remember it.
 */
const EXTRAS_PER_COLOR = 4; // besides the main photo
const POLL_MS = 2500;
const DESIGN_TYPES = ['front', 'default', 'embroidery_front_large', 'embroidery_front'];

function blobToken() {
  let t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) {
    const key = Object.keys(process.env).find((k) => k.endsWith('_READ_WRITE_TOKEN') && process.env[k]);
    t = key ? process.env[key] : '';
  }
  return String(t || '').trim().replace(/^["']|["']$/g, '').trim();
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Copies one Printful photo into our storage and returns its permanent URL. */
async function keep(url, path) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`couldn't download a mockup (${res.status})`);
  const type = res.headers.get('content-type') || 'image/jpeg';
  const blob = await put(path, Buffer.from(await res.arrayBuffer()), { access: 'public', token: blobToken(), contentType: type, addRandomSuffix: true });
  return blob.url;
}

/** Photos for one store product. Returns how many were saved. */
async function photosFor(sp, deadline) {
  const full = await pf('GET', `/store/products/${sp.id}`);
  const variants = (full?.sync_variants || []).filter((v) => !v.is_ignored);
  if (!variants.length) throw new Error('no variants');
  const catalogId = variants[0]?.product?.product_id;
  if (!catalogId) throw new Error('missing catalog product');

  // One variant per color, each with its own design file (dark shirts and light shirts differ).
  const byColor = new Map();
  for (const v of variants) {
    const key = v.color || '';
    if (byColor.has(key)) continue;
    const f = (v.files || []).find((x) => DESIGN_TYPES.includes(x.type)) || (v.files || []).find((x) => x.type !== 'preview');
    const fileUrl = f?.url || f?.preview_url;
    if (fileUrl) byColor.set(key, { variantId: v.variant_id || v.product?.variant_id, placement: f.type === 'default' ? 'default' : f.type, fileUrl });
  }
  if (!byColor.size) throw new Error('no design file found on the product');

  // Ask for the "merchiest" styles Printful offers for this product (people wearing it, lifestyle scenes).
  let groups = [];
  try {
    const pfiles = await pf('GET', `/mockup-generator/printfiles/${catalogId}`);
    const all = pfiles?.option_groups || [];
    groups = all.filter((g) => /lifestyle|men|women|couple|kid|model|wear|flat|hanger|front/i.test(g)).slice(0, 6);
  } catch { /* fine: Printful picks defaults */ }

  let saved = 0;
  const rows = [];
  for (const [color, c] of byColor) {
    if (Date.now() > deadline) break;
    const body = { variant_ids: [c.variantId], format: 'jpg', files: [{ placement: c.placement, image_url: c.fileUrl }] };
    let task;
    try {
      task = await pf('POST', `/mockup-generator/create-task/${catalogId}`, groups.length ? { ...body, option_groups: groups } : body);
    } catch (err) {
      if (!groups.length) throw err;
      task = await pf('POST', `/mockup-generator/create-task/${catalogId}`, body); // styles not accepted: use defaults
    }
    let result = null;
    while (Date.now() < deadline) {
      await wait(POLL_MS);
      const t = await pf('GET', `/mockup-generator/task?task_key=${encodeURIComponent(task.task_key)}`);
      if (t?.status === 'completed') { result = t; break; }
      if (t?.status === 'failed') throw new Error(t.error || 'mockup failed');
    }
    if (!result) break; // out of time; tap again to finish
    // People and lifestyle shots first (they sell best), then the clean product shot, then the rest.
    const rank = (t) => (/lifestyle|couple|model|wear/i.test(t) ? 0 : /men|women|kid/i.test(t) ? 1 : /^main$|front/i.test(t) ? 2 : 3);
    const all = [];
    for (const m of result.mockups || []) {
      if (m.mockup_url) all.push({ url: m.mockup_url, title: 'Main' });
      for (const x of m.extra || []) if (x.url) all.push({ url: x.url, title: x.title || x.option || x.option_group || '' });
    }
    const seen = new Set();
    const shots = all
      .filter((x) => !seen.has(x.url) && seen.add(x.url))
      .map((x, i) => ({ ...x, i }))
      .sort((a, b) => rank(a.title) - rank(b.title) || a.i - b.i);
    let i = 0;
    for (const s of shots.slice(0, EXTRAS_PER_COLOR + 1)) {
      const url = await keep(s.url, `merch/${sp.id}/${(color || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i}.jpg`);
      rows.push({ productId: String(sp.id), color, url, title: String(s.title).slice(0, 80), sort: rows.length });
      i++;
    }
  }
  if (rows.length) {
    await prisma.merchPhoto.deleteMany({ where: { productId: String(sp.id) } });
    await prisma.merchPhoto.createMany({ data: rows });
    saved = rows.length;
  }
  return saved;
}

/**
 * Makes photos for products that don't have any yet (or all of them when redo is true).
 * Stops when time runs short; tapping again carries on where it left off.
 */
export async function makeMerchPhotos({ redo = false, budgetMs = 48000 } = {}) {
  if (!blobToken()) throw new Error('Photo storage (Vercel Blob) isn’t connected, so photos can’t be saved.');
  const deadline = Date.now() + budgetMs;
  const list = ((await pf('GET', '/store/products?limit=100')) || []).filter((p) => !p.is_ignored);
  const have = new Set((await prisma.merchPhoto.findMany({ select: { productId: true }, distinct: ['productId'] })).map((r) => r.productId));
  const results = [];
  for (const sp of list) {
    if (!redo && have.has(String(sp.id))) { results.push({ name: sp.name, status: 'has' }); continue; }
    if (Date.now() > deadline - 8000) { results.push({ name: sp.name, status: 'later' }); continue; }
    try {
      const n = await photosFor(sp, deadline);
      results.push({ name: sp.name, status: n ? 'made' : 'later', count: n });
    } catch (err) {
      results.push({ name: sp.name, status: 'failed', error: String(err?.message || err).slice(0, 160) });
    }
  }
  return results;
}

/** Photos for the given products, grouped by product id. Never throws. */
export async function photosByProduct(ids) {
  if (!ids.length) return {};
  try {
    const rows = await prisma.merchPhoto.findMany({ where: { productId: { in: ids } }, orderBy: { sort: 'asc' } });
    const out = {};
    for (const r of rows) (out[r.productId] ||= []).push({ url: r.url, color: r.color, title: r.title });
    return out;
  } catch {
    return {};
  }
}
