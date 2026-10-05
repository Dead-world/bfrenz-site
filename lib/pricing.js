/**
 * Every price on BFRENZ lives here. Amounts are in cents (299 = $2.99).
 * Change a number, redeploy, done.
 */
export const PRICES = {
  supporterMonthly: 299, // Supporter, per month
  supporterYearly: 2499, // Supporter, per year (about 30% off monthly)
  usernameChange: 299, // changing your @username (the first change is free)
  usernameChangeCoins: 300, // ...or pay with coins instead
  supporterLifetime: 3999, // Lifetime Supporter, one time, forever
  giftSupporter: { 1: 299, 3: 799 }, // gift a friend Supporter for 1 or 3 months
  nameEffect: 199, // one name effect, one time, forever (all included with Supporter)
  proArtist: 999, // Pro Artist badge, one time, forever
  feature: 299, // Featured in "Cool New People" for FEATURE_DAYS
  songBoost: 499, // Song in "Featured Music" for SONG_BOOST_DAYS
  sponsorBulletin: 499, // Bulletin shown to every member for SPONSOR_HOURS
  tips: [300, 500, 1000, 2000], // tip jar buttons
  // Boost a post: shown as "Promoted" near the top of everyone's feed. Days -> price.
  postBoost: { 1: 199, 3: 499, 7: 999 },
  // Coin packs for gifts. More coins per dollar on bigger packs.
  coinPacks: [
    { coins: 100, cents: 99 },
    { coins: 550, cents: 499, tag: '+10%' },
    { coins: 1200, cents: 999, tag: '+20%' },
    { coins: 2600, cents: 1999, tag: 'Best value' },
  ],
};

/**
 * Stripe tax category sent with every item. Required when Stripe
 * "Managed Payments" is on (Stripe then collects and files sales tax for you).
 * txcd_10103000 = Software as a service (SaaS) - personal use.
 */
export const TAX_CODE = 'txcd_10103000';

export const FEATURE_DAYS = 7;
export const SONG_BOOST_DAYS = 7;
export const SPONSOR_HOURS = 24;

export function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
