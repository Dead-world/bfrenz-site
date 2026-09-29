'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { stripe, stripeConfigured } from '@/lib/stripe';
import { siteUrl } from '@/lib/email';
import { PRICES, FEATURE_DAYS, SONG_BOOST_DAYS, SPONSOR_HOURS, TAX_CODE, money } from '@/lib/pricing';
import { getTheme } from '@/lib/themes';
import { ABOUT_TEMPLATES, getAboutTemplate } from '@/lib/aboutTemplates';
import { canUseTheme, canUseAboutTemplate, cleanColor, isSupporter, ownedThemeSlugs, ownedAboutSlugs } from '@/lib/perks';
import { withParam } from '@/lib/util';
import { findSubscription, syncSubscription } from '@/lib/fulfill';

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
  const itemId = String(formData.get('itemId') || '');
  const back = String(formData.get('back') || '/shop');
  const safeBack = back.startsWith('/') && !back.startsWith('//') ? back : '/shop';

  if (!stripeConfigured()) fail(safeBack, "Payments aren't switched on yet. Check back soon!");

  if (kind === 'supporter' && isSupporter(me) && me.stripeSubscription) {
    fail('/shop', "You're already a Supporter. Thank you!");
  }
  if (kind === 'pro_artist' && me.artistPro) fail('/shop', 'You already have the Pro Artist badge.');
  if (kind === 'theme' && (await ownedThemeSlugs(me.id)).has(itemId)) fail('/shop', 'You already own that theme.');
  if (kind === 'about' && (await ownedAboutSlugs(me.id)).has(itemId)) fail('/shop#about', 'You already own that template.');

  const item = await describe(me, kind, itemId, formData.get('amount'));
  if (!item) fail(safeBack, 'That item is not available.');
  if (item.error) fail(safeBack, item.error);

  const base = siteUrl();
  const metadata = { userId: me.id, kind, itemId };
  const params = {
    mode: item.recurring ? 'subscription' : 'payment',
    client_reference_id: me.id,
    success_url: `${base}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}${safeBack}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: item.amount,
          product_data: { name: item.name, tax_code: TAX_CODE },
          ...(item.recurring ? { recurring: { interval: 'month' } } : {}),
        },
      },
    ],
    metadata,
    allow_promotion_codes: 'true',
  };
  params.customer_email = me.email;
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
