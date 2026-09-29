/**
 * Every price on BFRENZ lives here. Amounts are in cents (299 = $2.99).
 * Change a number, redeploy, done.
 */
export const PRICES = {
  supporterMonthly: 299, // Supporter, per month
  proArtist: 999, // Pro Artist badge, one time, forever
  feature: 299, // Featured in "Cool New People" for FEATURE_DAYS
  songBoost: 499, // Song in "Featured Music" for SONG_BOOST_DAYS
  sponsorBulletin: 499, // Bulletin shown to every member for SPONSOR_HOURS
  tips: [300, 500, 1000, 2000], // tip jar buttons
};

export const FEATURE_DAYS = 7;
export const SONG_BOOST_DAYS = 7;
export const SPONSOR_HOURS = 24;

export function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
