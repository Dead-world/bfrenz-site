'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { stripe, stripeConfigured } from '@/lib/stripe';
import { siteUrl } from '@/lib/email';
import { PRICES, FEATURE_DAYS, SONG_BOOST_DAYS, SPONSOR_HOURS, TAX_CODE, money } from '@/lib/pricing';
import { getTheme } from '@/lib/themes';
import { ABOUT_TEMPLATES, getAboutTemplate } from '@/lib/aboutTemplates';
import { getStamp } from '@/lib/stamps';
import { getNameEffect, ownsNameEffect } from '@/lib/nameEffects';
import { isBlockedEither } from '@/lib/moderation';
import { ownedStampSlugs } from '@/lib/stampsDb';
import { canUseTheme, canUseAboutTemplate, cleanColor, isSupporter, ownedThemeSlugs, ownedAboutSlugs } from '@/lib/perks';
import { withParam } from '@/lib/util';
import { findSubscription, syncSubscription } from '@/lib/fulfill';
import { inAndroidApp } from '@/lib/appMode';
import { usernameProblem } from '@/lib/usernames';
import { merchVariant, merchShipping, MERCH_COUNTRIES, MERCH_MAX_QTY, MERCH_TAX_CODE } from '@/lib/merch';
import { getSticker, stickerStock, STICKER_COUNTRIES, STICKER_MAX_QTY, STICKER_SHIPPING_CENTS, STICKER_TAX_CODE } from '@/lib/stickers';

function fail(path, msg) {
  redirect(withParam(path, 'error', msg));
}

/** Works out what is being bought, its price and its checkout label. */
async function describe(me, kind, itemId, amountRaw) {
  switch (kind) {
    case 'theme': {
      const t = getTheme(itemId);
      if (!t || t.price === 0) return null;
      return { amount: t.price, name: `BFRENZ theme: ${t.name}` };
    }
    case 'about': {
      const t = getAboutTemplate(itemId);
      if (!t || t.price === 0) return null;
      return { amount: t.price, name: `BFRENZ About Me template: ${t.name}` };
    }
    case 'supporter':
      return { amount: PRICES.supporterMonthly, name: 'BFRENZ Supporter (monthly)', recurring: true };
    case 'supporter_yearly':
      return { amount: PRICES.supporterYearly, name: 'BFRENZ Supporter (yearly)', recurring: true, interval: 'year' };
    case 'gift_coins': {
      // itemId is "username:coins" from the form; the checkout stores the member's id instead.
      const [who, coinsRaw] = String(itemId).split(':');
      const pack = PRICES.coinPacks.find((p) => String(p.coins) === String(coinsRaw));
      if (!pack) return null;
      const to = await prisma.user.findFirst({
        where: { OR: [{ username: who.trim().replace(/^@/, '').toLowerCase() }, { id: who }] },
        select: { id: true, displayName: true, bannedAt: true },
      });
      if (!to || to.bannedAt) return { error: 'We couldn’t find that member. Check their username.' };
      if (to.id === me.id) return { error: 'That’s you! To get coins for yourself, pick a pack above.' };
      if (await isBlockedEither(me.id, to.id)) return { error: "You can't send coins to this member." };
      return { amount: pack.cents, name: `Gift: ${pack.coins.toLocaleString('en-US')} BFRENZ coins for ${to.displayName}`, itemId: `${to.id}:${pack.coins}` };
    }
    case 'username': {
      const name = String(itemId).trim().toLowerCase();
      const problem = await usernameProblem(me, name);
      if (problem) return { error: problem };
      return { amount: PRICES.usernameChange, name: `Change your BFRENZ username to @${name}`, itemId: name };
    }
    case 'supporter_lifetime':
      return { amount: PRICES.supporterLifetime, name: 'BFRENZ Lifetime Supporter (one time, forever)' };
    case 'gift_supporter': {
      const [toId, monthsRaw] = String(itemId).split(':');
      const months = Number(monthsRaw);
      const amount = PRICES.giftSupporter[months];
      if (!amount) return null;
      const to = await prisma.user.findUnique({ where: { id: toId }, select: { id: true, displayName: true, bannedAt: true } });
      if (!to || to.bannedAt) return { error: 'That member could not be found.' };
      if (to.id === me.id) return { error: 'Gifts are for frenz! To get Supporter yourself, use the Supporter button.' };
      if (await isBlockedEither(me.id, to.id)) return { error: "You can't send a gift to this member." };
      return { amount, name: `Gift: ${months} ${months === 1 ? 'month' : 'months'} of BFRENZ Supporter for ${to.displayName}` };
    }
    case 'name_effect': {
      const fx = getNameEffect(itemId);
      if (!fx) return null;
      return { amount: PRICES.nameEffect, name: `BFRENZ name effect: ${fx.name}` };
    }
    case 'pro_artist':
      return { amount: PRICES.proArtist, name: 'BFRENZ Pro Artist badge (lifetime)' };
    case 'feature':
      return { amount: PRICES.feature, name: `Featured in Cool New People (${FEATURE_DAYS} days)` };
    case 'song_boost':
      if (!me.songUrl) return { error: 'Add a profile song first (Edit Profile -> Profile song).' };
      return { amount: PRICES.songBoost, name: `Featured Music spot (${SONG_BOOST_DAYS} days)` };
    case 'sponsor_bulletin': {
      const b = await prisma.bulletin.findUnique({ where: { id: itemId } });
      if (!b || b.authorId !== me.id) return { error: 'You can only sponsor your own bulletins.' };
      return { amount: PRICES.sponsorBulletin, name: `Sponsored bulletin (${SPONSOR_HOURS} hours): ${b.subject.slice(0, 60)}` };
    }
    case 'stamp': {
      const st = getStamp(itemId);
      if (!st || st.tier !== 'shop') return null;
      return { amount: st.price, name: `BFRENZ stamp: ${st.name} (give it forever)` };
    }
    case 'post_boost': {
      const [postId, daysRaw] = String(itemId).split(':');
      const amount = PRICES.postBoost[Number(daysRaw)];
      if (!amount) return null;
      const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, body: true } });
      if (!post || post.authorId !== me.id) return { error: 'You can only boost your own posts.' };
      const label = (post.body || 'photo / video / song').replace(/\s+/g, ' ').slice(0, 50);
      return { amount, name: `Boost a post for ${daysRaw} ${daysRaw === '1' ? 'day' : 'days'}: "${label}"` };
    }
    case 'coins': {
      const pack = PRICES.coinPacks.find((p) => String(p.coins) === String(itemId));
      if (!pack) return null;
      return { amount: pack.cents, name: `${pack.coins.toLocaleString('en-US')} BFRENZ coins` };
    }
    case 'sticker': {
      // itemId is "slug:qty"
      const [slug, qtyRaw] = String(itemId).split(':');
      const st = getSticker(slug);
      const qty = parseInt(qtyRaw, 10);
      if (!st || !(qty >= 1 && qty <= STICKER_MAX_QTY)) return null;
      const left = await stickerStock(slug);
      if (left !== null && left < 1) return { error: 'Stickers are sold out right now. Check back soon!' };
      if (left !== null && qty > left) return { error: `Only ${left} left. Pick ${left} or fewer.` };
      return { amount: st.cents, qty, name: st.name, physical: true, itemId: `${slug}:${qty}` };
    }
    case 'merch': {
      // itemId is "printfulVariantId:qty"; the price always comes fresh from Printful.
      const [variantId, qtyRaw] = String(itemId).split(':');
      const qty = parseInt(qtyRaw, 10);
      if (!(qty >= 1 && qty <= MERCH_MAX_QTY)) return null;
      const v = await merchVariant(variantId);
      if (!v) return { error: 'That item isn’t available right now.' };
      if (!v.inStock) return { error: 'That size/color is out of stock right now. Try another one.' };
      return {
        amount: v.cents, qty, name: v.name, physical: true, image: v.img,
        shipping: { cents: merchShipping(qty), label: 'Standard shipping', countries: MERCH_COUNTRIES, days: [5, 12] },
        tax: MERCH_TAX_CODE, itemId: `${v.id}:${qty}`,
        extra: { name: v.name.slice(0, 200), img: v.img.slice(0, 400), productId: v.productId },
      };
    }
    case 'tip': {
      const amount = parseInt(amountRaw, 10);
      if (!PRICES.tips.includes(amount)) return null;
      return { amount, name: `Tip for BFRENZ (${money(amount)})` };
    }
  }
  return null;
}

export async function startCheckout(formData) {
  const me = await requireUser();
  const kind = String(formData.get('kind') || '');
  let itemId = String(formData.get('itemId') || '');
  // The "send coins to a fren" form sends the username and pack separately.
  if (!itemId && formData.get('qtyPick')) itemId = String(formData.get('qtyPick')).slice(0, 60);
  if (!itemId && formData.get('to')) itemId = `${String(formData.get('to')).slice(0, 30)}:${String(formData.get('pack') || '')}`;
  const back = String(formData.get('back') || '/shop');
  const safeBack = back.startsWith('/') && !back.startsWith('//') ? back : '/shop';

  if (!stripeConfigured()) fail(safeBack, "Payments aren't switched on yet. Check back soon!");
  // Google Play's billing rules are for digital items, so real stickers can be bought in the app.
  if (kind !== 'sticker' && kind !== 'merch' && (await inAndroidApp())) fail(safeBack, "Purchases aren't available in the Android app.");

  if ((kind === 'supporter' || kind === 'supporter_yearly') && isSupporter(me) && me.stripeSubscription) {
    fail('/shop', "You're already a Supporter. Thank you!");
  }
  if (kind === 'pro_artist' && me.artistPro) fail('/shop', 'You already have the Pro Artist badge.');
  if (kind === 'theme' && (await ownedThemeSlugs(me.id)).has(itemId)) fail('/shop', 'You already own that theme.');
  if (kind === 'about' && (await ownedAboutSlugs(me.id)).has(itemId)) fail('/shop#about', 'You already own that template.');
  if (kind === 'stamp' && (await ownedStampSlugs(me.id)).has(itemId)) fail('/stamps', 'You already own that stamp.');
  if (kind === 'supporter_lifetime' && me.lifetimeSupporter) fail('/shop#supporter', "You're already a Lifetime Supporter. Thank you!");
  if (kind === 'name_effect' && ownsNameEffect(me, itemId)) fail('/shop#name-effects', isSupporter(me) ? 'Name effects are included with Supporter. Just hit "Use".' : 'You already own that effect.');

  const item = await describe(me, kind, itemId, formData.get('amount'));
  if (!item) fail(safeBack, 'That item is not available.');
  if (item.error) fail(safeBack, item.error);

  const base = siteUrl();
  const metadata = { userId: me.id, kind, itemId: item.itemId ?? itemId, ...(item.extra || {}) };
  const params = {
    mode: item.recurring ? 'subscription' : 'payment',
    client_reference_id: me.id,
    success_url: `${base}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}${safeBack}`,
    line_items: [
      {
        quantity: item.qty || 1,
        price_data: {
          currency: 'usd',
          unit_amount: item.amount,
          product_data: {
            name: item.name,
            tax_code: item.tax || (item.physical ? STICKER_TAX_CODE : TAX_CODE),
            ...(item.image && /^https:\/\//.test(item.image) ? { images: [item.image] } : {}),
          },
          ...(item.recurring ? { recurring: { interval: item.interval || 'month' } } : {}),
        },
      },
    ],
    metadata,
    allow_promotion_codes: 'true',
  };
  params.customer_email = me.email;
  if (item.physical) {
    // Managed Payments (on by default for this Stripe account) only allows digital items,
    // so real stickers and merch use a normal checkout. Everything else keeps Managed Payments.
    params.managed_payments = { enabled: 'false' };
    // Mailed items: Stripe asks for the address and adds the flat shipping charge.
    const sh = item.shipping || { cents: STICKER_SHIPPING_CENTS, label: STICKER_SHIPPING_CENTS ? 'Mailed by USPS' : 'Free shipping (USPS)', countries: STICKER_COUNTRIES, days: [3, 10] };
    params.shipping_address_collection = { allowed_countries: sh.countries };
    params.shipping_options = [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: sh.label,
          fixed_amount: { amount: sh.cents, currency: 'usd' },
          delivery_estimate: { minimum: { unit: 'business_day', value: sh.days[0] }, maximum: { unit: 'business_day', value: sh.days[1] } },
        },
      },
    ];
  }
  if (item.recurring) params.subscription_data = { metadata };
  else params.payment_intent_data = { metadata };

  let session;
  try {
    session = await stripe.createCheckoutSession(params);
  } catch (err) {
    console.error('[checkout] failed:', err);
    // The site owner sees Stripe's exact reason; everyone else gets a friendly message.
    const owner = (process.env.FOUNDER_USERNAME || '').toLowerCase() === me.username;
    fail(safeBack, owner ? `Checkout error (only you see this): ${String(err?.message || err).slice(0, 400)}` : "Couldn't start checkout. Please try again in a minute.");
  }
  redirect(session.url);
}

async function setCancel(cancel) {
  const me = await requireUser();
  const sub = await findSubscription(me);
  if (!sub || sub.metadata?.userId !== me.id || !['active', 'trialing', 'past_due'].includes(sub.status)) {
    fail('/shop', "We couldn't find an active Supporter subscription for you.");
  }
  try {
    const updated = await stripe.updateSubscription(sub.id, { cancel_at_period_end: cancel ? 'true' : 'false' });
    await syncSubscription(updated);
  } catch (err) {
    console.error('[subscription] update failed:', err);
    const owner = (process.env.FOUNDER_USERNAME || '').toLowerCase() === me.username;
    fail('/shop', owner ? `Subscription error (only you see this): ${String(err?.message || err).slice(0, 400)}` : 'Something went wrong. Please try again in a minute.');
  }
  redirect(`/shop?${cancel ? 'cancelled' : 'resumed'}=1#supporter`);
}

/** Cancels at the end of the paid month (perks stay until then). */
export async function cancelSupporter() {
  return setCancel(true);
}

/** Undoes a pending cancellation. */
export async function resumeSupporter() {
  return setCancel(false);
}

export async function applyTheme(formData) {
  const me = await requireUser();
  const slug = String(formData.get('slug') || '');
  if (slug && !(await canUseTheme(me, slug))) fail('/shop', 'Buy that theme (or become a Supporter) to use it.');
  await prisma.user.update({ where: { id: me.id }, data: { theme: slug } });
  redirect(slug ? `/${me.username}` : '/shop?saved=1');
}

export async function saveSupporterPrefs(formData) {
  const me = await requireUser();
  if (!isSupporter(me)) fail('/shop', 'Name colors are a Supporter perk.');
  await prisma.user.update({ where: { id: me.id }, data: { nameColor: cleanColor(formData.get('nameColor')) } });
  redirect('/shop?saved=1#supporter');
}

/**
 * Puts an About Me template on the member's profile.
 * mode=fill replaces their About Me with the template's starter text (the old one is saved as a backup);
 * mode=style keeps their words and only applies the template's look.
 */
export async function applyAboutTemplate(formData) {
  const me = await requireUser();
  const slug = String(formData.get('slug') || '');
  const mode = formData.get('mode') === 'style' ? 'style' : 'fill';
  const t = getAboutTemplate(slug);
  if (!t) fail('/shop#about', 'That template is not available.');
  if (!(await canUseAboutTemplate(me, slug))) fail('/shop#about', 'Buy that template (or become a Supporter) to use it.');
  const data = { aboutTemplate: slug };
  if (mode === 'fill') {
    data.aboutMe = t.html;
    if (me.aboutMe && me.aboutMe.trim() && !getAboutTemplateByHtml(me.aboutMe)) data.aboutMeBackup = me.aboutMe;
  }
  await prisma.user.update({ where: { id: me.id }, data });
  redirect(mode === 'fill' ? '/edit?tab=info&template=1' : `/${me.username}`);
}

function getAboutTemplateByHtml(html) {
  return ABOUT_TEMPLATES.find((t) => t.html === html);
}

/** Removes the template's look (keeps the text). */
export async function removeAboutTemplate() {
  const me = await requireUser();
  await prisma.user.update({ where: { id: me.id }, data: { aboutTemplate: '' } });
  redirect('/edit?tab=info&saved=1');
}

/** Swaps the About Me back to what they had before using a template. */
export async function restoreAboutBackup() {
  const me = await requireUser();
  if (!me.aboutMeBackup) redirect('/edit?tab=info');
  await prisma.user.update({
    where: { id: me.id },
    data: { aboutMe: me.aboutMeBackup, aboutMeBackup: me.aboutMe, aboutTemplate: '' },
  });
  redirect('/edit?tab=info&saved=1');
}

/** Show (or remove, with an empty slug) a name effect the member owns. */
export async function setNameEffect(formData) {
  const me = await requireUser();
  const slug = String(formData.get('slug') || '');
  if (slug && !ownsNameEffect(me, slug)) fail('/shop#name-effects', 'Get that effect first.');
  await prisma.user.update({ where: { id: me.id }, data: { nameEffect: slug } });
  redirect('/shop?saved=1#name-effects');
}
