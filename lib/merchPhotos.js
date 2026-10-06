import { put } from '@vercel/blob';
import { prisma } from './db';
import { pf } from './printful';

/**
 * Real product photos from Printful's mockup generator (your design on the actual shirt,
 * on models, flat lays and lifestyle shots). Printful's links expire, so we copy each
 * photo into the site's Blob storage and remember it.
 *
 * Printful only allows a few photo jobs per minute, so this works in small steps:
 * when Printful says "slow down", we stop, keep what's done, and carry on next time.
 */
const PER_COLOR = 5; // photos kept per color
const POLL_MS = 2500;
const DESIGN_TYPES = ['front', 'default', 'embroidery_front_large', 'embroidery_front'];

export class SlowDown extends Error {
  constructor(seconds) {
    super(`Printful asks us to wait ${seconds} seconds`);
    this.seconds = seconds;
  }
}

function blobToken() {
  let t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) {
    const key = Object.keys(process.env).find((k) => k.endsWith('_READ_WRITE_TOKEN') && process.env[k]);
    t = key ? process.env[key] : '';
  }
  return String(t || '').trim().replace(/^["']|["']$/g, '').trim();
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Printful call that turns "too many requests" into a SlowDown with the wait time. */
async function pfc(method, path, body) {
  try {
    return await pf(method, path, body);
  } catch (err) {
    const msg = String(err?.message || '');
    if (/\b429\b|too many requests/i.test(msg)) throw new SlowDown(parseInt((msg.match(/after (\d+) seconds/) || [])[1], 10) || 60);
    throw err;
  }
}

/** Width and height of a PNG or JPEG at a URL (reads only the start of the file). */
async function imageSize(url) {
  const res = await fetch(url, { headers: { Range: 'bytes=0-131071' }, cache: 'no-store' });
  if (!res.ok && res.status !== 206) throw new Error(`couldn't read the design file (${res.status})`);
  const b = Buffer.from(await res.arrayBuffer());
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  }
  throw new Error('design file must be a PNG or JPG');
}

/** Where the design goes inside Printful's print area: fit (or fill for cases), top-aligned on clothing. */
function position(area, img, { fill = false, top = false } = {}) {
  const s = fill ? Math.max(area.width / img.w, area.height / img.h) : Math.min(area.width / img.w, area.height / img.h);
  const width = Math.round(img.w * s);
  const height = Math.round(img.h * s);
  return {
    area_width: area.width,
    area_height: area.height,
    width,
    height,
    left: Math.round((area.width - width) / 2),
    top: top ? 0 : Math.round((area.height - height) / 2),
  };
}

/**
 * Photos for one store product, one color at a time. Each finished color is saved
 * right away, so nothing is lost if Printful asks us to wait.
 * Returns { saved, done }.
 */
async function photosFor(sp, deadline, redo) {
  const pid = String(sp.id);
  const full = await pfc('GET', `/store/products/${sp.id}`);
  const variants = (full?.sync_variants || []).filter((v) => !v.is_ignored);
  if (!variants.length) throw new Error('no variants');
  const catalogId = variants[0]?.product?.product_id;
  if (!catalogId) throw new Error('missing catalog product');

  const byColor = new Map();
  for (const v of variants) {
    const key = v.color || '';
    if (byColor.has(key)) continue;
    const f = (v.files || []).find((x) => DESIGN_TYPES.includes(x.type)) || (v.files || []).find((x) => x.type !== 'preview');
    const fileUrl = f?.url || f?.preview_url;
    if (fileUrl) byColor.set(key, { variantId: v.variant_id || v.product?.variant_id, placement: f.type, fileUrl });
  }
  if (!byColor.size) throw new Error('no design file found on the product');

  const existing = await prisma.merchPhoto.findMany({ where: { productId: pid } });
  const doneColors = new Set(redo ? [] : existing.map((r) => r.color));
  if (redo && existing.length) await prisma.merchPhoto.deleteMany({ where: { productId: pid } });

  const todo = [...byColor].filter(([color]) => !doneColors.has(color));
  if (!todo.length) return { saved: 0, done: true };

  const info = await pfc('GET', `/mockup-generator/printfiles/${catalogId}`);
  const groups = (info?.option_groups || []).filter((g) => /lifestyle|men|women|couple|kid|model|wear|flat|hanger|front/i.test(g)).slice(0, 6);
  const apparel = /^(front|back)$/;

  let saved = 0;
  let sort = redo ? 0 : existing.length;
  for (const [color, c] of todo) {
    if (Date.now() > deadline) return { saved, done: false };
    const vp = (info?.variant_printfiles || []).find((x) => String(x.variant_id) === String(c.variantId));
    const placement = vp?.placements?.[c.placement] ? c.placement : Object.keys(vp?.placements || {})[0] || c.placement;
    const printfile = (info?.printfiles || []).find((p) => String(p.printfile_id) === String(vp?.placements?.[placement]));
    const file = { placement, image_url: c.fileUrl };
    if (printfile?.width && printfile?.height) {
      file.position = position(printfile, await imageSize(c.fileUrl), { fill: printfile.fill_mode === 'cover', top: apparel.test(placement) });
    }
    const body = { variant_ids: [c.variantId], format: 'jpg', files: [file] };
    let task;
    try {
      task = await pfc('POST', `/mockup-generator/create-task/${catalogId}`, groups.length ? { ...body, option_groups: groups } : body);
    } catch (err) {
      if (err instanceof SlowDown || !groups.length || !/option/i.test(String(err?.message))) throw err;
      task = await pfc('POST', `/mockup-generator/create-task/${catalogId}`, body); // those styles weren't accepted: use defaults
    }
    let result = null;
    while (Date.now() < deadline + 15000) {
      await wait(POLL_MS);
      const t = await pfc('GET', `/mockup-generator/task?task_key=${encodeURIComponent(task.task_key)}`);
      if (t?.status === 'completed') { result = t; break; }
      if (t?.status === 'failed') throw new Error(t.error || 'mockup failed');
    }
    if (!result) return { saved, done: false };

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
      .sort((a, b) => rank(a.title) - rank(b.title) || a.i - b.i)
      .slice(0, PER_COLOR);
    const rows = [];
    for (const [i, s] of shots.entries()) {
      const res = await fetch(s.url, { cache: 'no-store' });
      if (!res.ok) continue;
      const blob = await put(`merch/${pid}/${(color || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i}.jpg`, Buffer.from(await res.arrayBuffer()), {
        access: 'public', token: blobToken(), contentType: res.headers.get('content-type') || 'image/jpeg', addRandomSuffix: true,
      });
      rows.push({ productId: pid, color, url: blob.url, title: String(s.title).slice(0, 80), sort: sort++ });
    }
    if (rows.length) await prisma.merchPhoto.createMany({ data: rows });
    saved += rows.length;
  }
  return { saved, done: true };
}

/**
 * Makes photos for products that don't have them yet (or all of them when redo is true).
 * Returns { results, waitSeconds }: waitSeconds is set when Printful asked us to slow down.
 */
export async function makeMerchPhotos({ redo = false, budgetMs = 40000 } = {}) {
  if (!blobToken()) throw new Error('Photo storage (Vercel Blob) isn’t connected, so photos can’t be saved.');
  const deadline = Date.now() + budgetMs;
  // Redo: clear every photo first, then make them all again (the follow-up steps just continue).
  if (redo) {
    await prisma.merchPhoto.deleteMany({});
    redo = false;
  }
  const list = ((await pfc('GET', '/store/products?limit=100')) || []).filter((p) => !p.is_ignored);
  // Oldest first, so the shirts are done before the phone case.
  list.sort((a, b) => Number(a.id) - Number(b.id));
  const results = [];
  let waitSeconds = 0;
  for (const sp of list) {
    if (waitSeconds || Date.now() > deadline - 8000) { results.push({ name: sp.name, status: 'later' }); continue; }
    try {
      const r = await photosFor(sp, deadline, redo);
      results.push({ name: sp.name, status: r.done ? (r.saved ? 'made' : 'has') : 'later', count: r.saved });
    } catch (err) {
      if (err instanceof SlowDown) { waitSeconds = err.seconds; results.push({ name: sp.name, status: 'later' }); continue; }
      results.push({ name: sp.name, status: 'failed', error: String(err?.message || err).slice(0, 160) });
    }
  }
  return { results, waitSeconds };
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
