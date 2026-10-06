import { prisma } from './db';
import { stripe, periodEnd } from './stripe';
import { FEATURE_DAYS, SONG_BOOST_DAYS, SPONSOR_HOURS } from './pricing';
import { notify } from './push';
import { getSticker, shippingFrom } from './stickers';
import { createMerchOrder } from './merchOrders';

const DAY = 24 * 60 * 60 * 1000;

/** Extends a "until" date: from now, or from the current end if still running. */
function extend(current, ms) {
  const base = current && new Date(current) > new Date() ? new Date(current) : new Date();
  return new Date(base.getTime() + ms);
}

/**
 * Gives the buyer what they paid for. Safe to call more than once for the
 * same checkout (the webhook and the success page both call it).
 * Returns the purchase kind, or null if the session isn't paid.
 */
export async function fulfillCheckout(session) {
  const md = session?.metadata || {};
  const userId = md.userId;
  const kind = md.kind;
  if (!userId || !kind) return null;
  const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
  if (session.status !== 'complete' || !paid) return null;

  try {
    await prisma.purchase.create({
      data: {
        userId,
        kind,
        itemId: md.itemId || '',
        amountCents: session.amount_total ?? 0,
        stripeSessionId: session.id,
      },
    });
  } catch (e) {
    if (e?.code === 'P2002') return kind; // already handled
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return kind;

  switch (kind) {
    case 'supporter':
    case 'supporter_yearly': {
      const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      let until = new Date(Date.now() + (kind === 'supporter_yearly' ? 366 : 31) * DAY);
      if (subId) {
        try {
          until = periodEnd(await stripe.getSubscription(subId)) || until;
        } catch {}
      }
      await prisma.user.update({
        where: { id: userId },
        data: {
          supporterUntil: until,
          stripeSubscription: subId || null,
        },
      });
      break;
    }
    case 'supporter_lifetime': {
      await prisma.user.update({ where: { id: userId }, data: { lifetimeSupporter: true } });
      // Stop their monthly plan so they're never charged again.
      if (user.stripeSubscription) {
        try {
          await stripe.cancelSubscriptionNow(user.stripeSubscription);
        } catch (err) {
          console.error('[lifetime] could not cancel monthly plan:', err?.message);
        }
      }
      break;
    }
    case 'gift_supporter': {
      const [toId, monthsRaw] = String(md.itemId || '').split(':');
      const months = Math.min(Math.max(parseInt(monthsRaw, 10) || 1, 1), 12);
      const to = await prisma.user.findUnique({ where: { id: toId } });
      if (to) {
        await prisma.user.update({
          where: { id: to.id },
          data: { bonusSupporterUntil: extend(to.bonusSupporterUntil, months * 31 * DAY) },
        });
        notify(to.id, {
          title: `🎁 ${user.displayName} gifted you Supporter!`,
          body: `${months} ${months === 1 ? 'month' : 'months'} of every theme, Top 16, a name color and more. Enjoy!`,
          url: '/shop#supporter',
        });
      }
      break;
    }
    case 'name_effect': {
      const owned = new Set([...(user.nameEffectsOwned || []), md.itemId]);
      await prisma.user.update({ where: { id: userId }, data: { nameEffectsOwned: [...owned], nameEffect: md.itemId } });
      break;
    }
    case 'pro_artist':
      await prisma.user.update({ where: { id: userId }, data: { artistPro: true, isArtist: true } });
      break;
    case 'feature':
      await prisma.user.update({
        where: { id: userId },
        data: { featuredUntil: extend(user.featuredUntil, FEATURE_DAYS * DAY) },
      });
      break;
    case 'song_boost':
      await prisma.user.update({
        where: { id: userId },
        data: { songBoostUntil: extend(user.songBoostUntil, SONG_BOOST_DAYS * DAY) },
      });
      break;
    case 'sponsor_bulletin': {
      const b = await prisma.bulletin.findUnique({ where: { id: md.itemId || '' } });
      if (b && b.authorId === userId) {
        await prisma.bulletin.update({
          where: { id: b.id },
          data: { sponsoredUntil: extend(b.sponsoredUntil, SPONSOR_HOURS * 60 * 60 * 1000) },
        });
      }
      break;
    }
    case 'post_boost': {
      const [postId, daysRaw] = String(md.itemId || '').split(':');
      const days = Math.min(Math.max(parseInt(daysRaw, 10) || 1, 1), 30);
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (post && post.authorId === userId) {
        // Promoted posts are shown to everyone, so they become public.
        await prisma.post.update({
          where: { id: post.id },
          data: { boostUntil: extend(post.boostUntil, days * DAY), visibility: 'public' },
        });
      }
      break;
    }
    case 'gift_coins': {
      const [toId, coinsRaw] = String(md.itemId || '').split(':');
      const coins = parseInt(coinsRaw, 10);
      const to = await prisma.user.findUnique({ where: { id: toId } });
      if (to && coins > 0 && coins <= 100000) {
        await prisma.user.update({ where: { id: to.id }, data: { coins: { increment: coins } } });
        notify(to.id, { title: `🪙 ${user.displayName} sent you ${coins.toLocaleString('en-US')} coins!`, body: 'Spend them on gifts, Super Comments, frames and effects.', url: '/coins' });
      }
      break;
    }
    case 'username': {
      const { applyUsername } = await import('./usernames');
      await applyUsername(user, String(md.itemId || ''), { paid: true }).catch((e) => console.error('[username] after payment:', e?.message));
      break;
    }
    case 'coins': {
      const coins = parseInt(md.itemId, 10);
      if (coins > 0 && coins <= 100000) await prisma.user.update({ where: { id: userId }, data: { coins: { increment: coins } } });
      break;
    }
    case 'merch':
      await createMerchOrder(session, user, md, shippingFrom(session));
      break;
    case 'sticker': {
      const [slug, qtyRaw] = String(md.itemId || '').split(':');
      const qty = parseInt(qtyRaw, 10);
      const st = getSticker(slug);
      if (!st || !(qty > 0)) break;
      await prisma.stickerOrder.create({
        data: { userId, slug, qty, amountCents: session.amount_total ?? 0, stripeSessionId: session.id, ...shippingFrom(session) },
      });
      await prisma.shopStock.updateMany({ where: { slug }, data: { stock: { decrement: qty } } });
      await prisma.shopStock.updateMany({ where: { slug, stock: { lt: 0 } }, data: { stock: 0 } });
      const owner = (process.env.FOUNDER_USERNAME || '').toLowerCase();
      const boss = owner ? await prisma.user.findUnique({ where: { username: owner }, select: { id: true } }) : null;
      if (boss) notify(boss.id, { title: `📦 New sticker order: ${qty} from @${user.username}`, body: 'Mail it, then mark it shipped on the admin page.', url: '/admin?tab=stickers', tag: 'sticker-orders' });
      break;
    }
    // 'theme', 'about' and 'tip' need nothing beyond the purchase record.
  }
  return kind;
}

/** Keeps Supporter status in sync when a subscription renews, lapses or is cancelled. */
export async function syncSubscription(sub) {
  if (!sub?.id) return;
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { stripeSubscription: sub.id },
        ...(sub.metadata?.userId ? [{ id: sub.metadata.userId }] : []),
      ],
    },
  });
  if (!user) return;
  const active = ['active', 'trialing', 'past_due'].includes(sub.status);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeSubscription: sub.id,
      supporterUntil: active ? periodEnd(sub) || user.supporterUntil : new Date(),
    },
  });
}

/**
 * Finds a member's Supporter subscription in Stripe: by the saved ID, or by
 * searching for the userId stored on the subscription. Returns null if none.
 */
export async function findSubscription(user) {
  const mine = (s) => s?.metadata?.userId === user.id;
  const pick = (subs) => {
    const list = subs.filter(mine).sort((a, b) => b.created - a.created);
    return list.find((s) => ['active', 'trialing', 'past_due'].includes(s.status)) || list[0] || null;
  };

  if (user.stripeSubscription) {
    try {
      const sub = await stripe.getSubscription(user.stripeSubscription);
      if (mine(sub)) return sub;
    } catch (err) {
      console.error('[subscription] lookup by id failed:', err?.message);
    }
  }
  try {
    const res = await stripe.searchSubscriptions(`metadata['userId']:'${String(user.id).replace(/[^a-z0-9]/gi, '')}'`);
    const found = pick(res?.data || []);
    if (found) return found;
  } catch (err) {
    console.error('[subscription] search failed:', err?.message);
  }
  // Backup: walk recent subscriptions directly (search can lag or be unavailable).
  try {
    let startingAfter;
    const all = [];
    for (let page = 0; page < 5; page++) {
      const res = await stripe.listSubscriptions({ status: 'all', limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
      const data = res?.data || [];
      all.push(...data);
      const found = pick(all);
      if (found && ['active', 'trialing', 'past_due'].includes(found.status)) return found;
      if (!res?.has_more || !data.length) break;
      startingAfter = data[data.length - 1].id;
    }
    return pick(all);
  } catch (err) {
    console.error('[subscription] list failed:', err?.message);
    return null;
  }
}

/** Re-checks a member's Supporter status with Stripe (works even if a webhook was missed). */
export async function refreshSupporter(user) {
  const sub = await findSubscription(user);
  if (sub) await syncSubscription(sub);
  return sub;
}

/** Owner-only: explains what the Supporter lookup sees. */
export async function diagnoseSupporter(user) {
  const lines = [`Your BFRENZ user id: ${user.id}`, `Saved subscription id: ${user.stripeSubscription || '(none)'}`];
  try {
    const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
    lines.push(`Stripe key in use: ${key.slice(0, 8)}…${key.slice(-4)}`);
    const res = await stripe.listSubscriptions({ status: 'all', limit: 20 });
    const data = res?.data || [];
    lines.push(`Stripe returned ${data.length} subscription(s)${res?.has_more ? ' (more exist)' : ''}:`);
    for (const s of data.slice(0, 10)) {
      lines.push(`  ${s.id} · ${s.status}${s.cancel_at_period_end ? ' (cancel at period end)' : ''} · userId=${s.metadata?.userId || '(none)'}${s.metadata?.userId === user.id ? '  <= YOU' : ''}`);
    }
  } catch (err) {
    lines.push(`Stripe error: ${String(err?.message || err).slice(0, 300)}`);
  }
  return lines.join('\n');
}
