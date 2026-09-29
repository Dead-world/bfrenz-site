// The theme shop catalog. price is in cents (0 = free for everyone).
// Supporters can use every theme. Preview images live in public/themes/<slug>.png
import midnightRed from './midnight-red';
import moneyTalks from './money-talks';
import redMoney from './red-money';
import systemOverride from './system-override';
import miamiNights from './miami-nights';
import pinkElephant from './pink-elephant';

export const THEMES = [
  { slug: 'midnight-red', name: "Midnight Red", price: 0, description: "Red & black poster layout with a glowing name, round Top 8 and chat-bubble comments.", css: midnightRed },
  { slug: 'money-talks', name: "Money Talks", price: 199, description: "Red & black over a photo of fanned $100 bills, with see-through boxes.", css: moneyTalks },
  { slug: 'red-money', name: "Red Money", price: 299, description: "Money falls inside every see-through box. Add your own background picture.", css: redMoney },
  { slug: 'system-override', name: "System Override", price: 299, description: "Cyberpunk red & cyan: glitching name, scan lines, reticle cursor and falling money.", css: systemOverride },
  { slug: 'miami-nights', name: "Miami Nights", price: 299, description: "80s neon sunset in black & gold with shimmering gold lettering and a $ coin cursor.", css: miamiNights },
  { slug: 'pink-elephant', name: "Pink Elephant", price: 199, description: "Pink & black over an elephant photo, with an elephant cursor.", css: pinkElephant },
];

export function getTheme(slug) {
  return THEMES.find((t) => t.slug === slug) || null;
}
