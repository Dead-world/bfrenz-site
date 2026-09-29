// About Me template shop. price is in cents (0 = free for everyone).
// Supporters can use every template. Previews live in public/about/<slug>.png
import * as classic from './classic';
import * as survey from './survey';
import * as tradingCard from './trading-card';
import * as dossier from './dossier';
import * as pressKit from './press-kit';
import * as diary from './diary';
import * as receipt from './receipt';
import * as soft from './soft';

export const ABOUT_TEMPLATES = [
  { slug: 'classic', name: 'The Classic', price: 0, description: 'About me, who I\'d like to meet, a "currently" list and a favorite quote.', ...classic },
  { slug: 'survey', name: 'The Survey', price: 99, description: 'The 20-question bulletin survey, right on your profile. Zebra-striped and ready to fill in.', ...survey },
  { slug: 'trading-card', name: 'Trading Card', price: 199, description: 'You as a holographic collectible card: stat bars, special move and weakness.', ...tradingCard },
  { slug: 'dossier', name: 'Top Secret Dossier', price: 199, description: 'A classified file on you, stamped TOP SECRET, with hover-to-reveal redactions.', ...dossier },
  { slug: 'press-kit', name: 'Artist Press Kit', price: 299, description: 'For musicians and DJs: bio, releases, upcoming shows, streaming links and booking.', ...pressKit },
  { slug: 'diary', name: 'Dear Diary', price: 149, description: 'A handwritten notebook page with lined paper, a red margin and binder holes.', ...diary },
  { slug: 'receipt', name: 'Receipt', price: 149, description: 'Your personality, itemized on a store receipt. No refunds on friendship.', ...receipt },
  { slug: 'soft', name: 'Soft Aesthetic', price: 149, description: 'Pastel and cozy: likes, dislikes and a little intro in a soft card.', ...soft },
];

export function getAboutTemplate(slug) {
  return ABOUT_TEMPLATES.find((t) => t.slug === slug) || null;
}
