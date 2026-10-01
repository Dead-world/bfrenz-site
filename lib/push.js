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
function setup() {
  if (ready) return true;
  if (!pushConfigured()) return false;
  const subject = String(process.env.VAPID_SUBJECT || `mailto:${process.env.CONTACT_EMAIL || 'support@bfrenz.com'}`).trim();
  webpush.setVapidDetails(subject, vapidPublicKey(), String(process.env.VAPID_PRIVATE_KEY).trim());
  ready = true;
  return true;
}

/** Sends one notification to every device the member turned notifications on for. */
export async function sendPushNow(userId, { title, body = '', url = '/home', tag } = {}) {
  if (!userId || !setup()) return 0;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return 0;
  const payload = JSON.stringify({ title, body: String(body).slice(0, 180), url, tag });
  let sent = 0;
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 24,
          urgency: 'normal',
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

/**
 * Queue a notification to go out right after the page responds, so the person
 * taking the action never waits on it. Never throws.
 */
export function notify(userId, message) {
  if (!userId || !pushConfigured()) return;
  try {
    after(() => sendPushNow(userId, message).catch((e) => console.error('[push]', e?.message)));
  } catch {
    // Outside a request (shouldn't happen): send directly.
    sendPushNow(userId, message).catch(() => {});
  }
}
