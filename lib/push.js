import webpush from 'web-push';
import { after } from 'next/server';
import { prisma } from './db';

/**
 * Push notifications (Web Push). Works on Android, computers, and iPhones where
 * BFRENZ was added to the Home Screen (iOS 16.4+).
 * Needs in Vercel: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (and optionally VAPID_SUBJECT).
 */
export function pushConfigured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function vapidPublicKey() {
  return String(process.env.VAPID_PUBLIC_KEY || '').trim();
}

let ready = false;
/**
 * The contact address push services can use to reach the site owner.
 * Forgiving about typing: "Mailto:", a bare email, quotes or spaces all work.
 */
function vapidSubject() {
  let v = String(process.env.VAPID_SUBJECT || '').trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
  if (/^mailto:/i.test(v)) v = 'mailto:' + v.slice(7);
  else if (/^https:\/\//i.test(v)) v = 'https://' + v.slice(8);
  else if (v.includes('@')) v = 'mailto:' + v;
  else v = '';
  return v || `mailto:${String(process.env.CONTACT_EMAIL || 'support@bfrenz.com').trim()}`;
}

function setup() {
  if (ready) return true;
  if (!pushConfigured()) return false;
  webpush.setVapidDetails(vapidSubject(), vapidPublicKey(), String(process.env.VAPID_PRIVATE_KEY).trim());
  ready = true;
  return true;
}

/** Sends one notification to every device the member turned notifications on for. */
export async function sendPushNow(userId, { title, body = '', url = '/home', tag, urgency = 'normal', ttl = 60 * 60 * 24 } = {}) {
  if (!userId || !setup()) return 0;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return 0;
  const payload = JSON.stringify({ title, body: String(body).slice(0, 180), url, tag });
  let sent = 0;
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: ttl,
          // Calls go out as 'high' so phones deliver them right away instead of batching.
          urgency,
        });
        sent++;
      } catch (err) {
        // 404/410 = the device unsubscribed or the app was uninstalled: forget it.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { id: s.id } }).catch(() => {});
        } else {
          console.error('[push] send failed:', err?.statusCode, err?.body || err?.message);
        }
      }
    }),
  );
  return sent;
}

/** Saves an alert to the member's in-site 🔔 list. Same tag + still unread = update that one instead. */
export async function saveAlert(userId, { title, body = '', url = '/home', tag } = {}) {
  if (!userId || !title) return;
  const data = { title: String(title).slice(0, 200), body: String(body || '').slice(0, 300), url: String(url || '/home').slice(0, 400), tag: tag ? String(tag).slice(0, 120) : null };
  if (data.tag) {
    const open = await prisma.alert.findFirst({ where: { userId, tag: data.tag, seen: false }, select: { id: true } });
    if (open) {
      await prisma.alert.update({ where: { id: open.id }, data: { ...data, createdAt: new Date() } });
      return;
    }
  }
  await prisma.alert.create({ data: { userId, ...data } });
}

/** Saves the alert and sends the phone notification now (for cron jobs and other background work). */
export async function notifyNow(userId, message) {
  await saveAlert(userId, message).catch((e) => console.error('[alerts]', e?.message));
  if (pushConfigured()) return sendPushNow(userId, message).catch(() => 0);
  return 0;
}

/**
 * Queue a notification right after the page responds, so the person taking the action never
 * waits on it. It lands in their 🔔 list on the site and (if set up) on their phone.
 * Pass inApp: false for things the site already shows live (IM messages, a ringing call).
 * Never throws.
 */
export function notify(userId, message) {
  if (!userId) return;
  const run = async () => {
    if (message?.inApp !== false) await saveAlert(userId, message).catch((e) => console.error('[alerts]', e?.message));
    if (pushConfigured()) await sendPushNow(userId, message).catch((e) => console.error('[push]', e?.message));
  };
  try {
    after(run);
  } catch {
    // Outside a request (shouldn't happen): send directly.
    run().catch(() => {});
  }
}
