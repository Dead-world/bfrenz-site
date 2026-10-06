import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { stripe, stripeConfigured } from '@/lib/stripe';
import { fulfillCheckout } from '@/lib/fulfill';

export const metadata = { title: 'Thank you! | BFRENZ.com' };

const MESSAGES = {
  supporter: ["You're a Supporter! ★", 'Every theme is unlocked, your Top 16 is ready, and you can pick a name color in the shop.'],
  theme: ['Theme unlocked!', 'Head back to the shop and hit "Use theme" to put it on your profile.'],
  pro_artist: ['You went Pro! ♫', 'Your Pro Artist badge now shows on your profile and comments.'],
  feature: ["You're featured! ⭐", 'Look for yourself at the top of Cool New People.'],
  song_boost: ['Your song is promoted! 🎵', "It's now in Featured Music on the homepage."],
  sponsor_bulletin: ['Bulletin sponsored! 📢', 'Every member will see it in their bulletins.'],
  supporter_lifetime: ["You're a Lifetime Supporter! ★∞", 'Every perk, forever. If you had a monthly plan, it has been cancelled so you are never charged again. Thank you for believing in BFRENZ early. 🧡'],
  gift_supporter: ['Gift sent! 🎁', 'Your fren just got Supporter perks and a notification saying it was from you.'],
  name_effect: ['Name effect unlocked! ✨', 'It is already on your name. Change it anytime in the shop.'],
  stamp: ['Stamp unlocked! 🎟️', 'You can give it to as many frenz as you like. Visit a profile and hit "Give a stamp".'],
  tip: ['Thank you! 🧡', 'Your tip helps keep BFRENZ free for everyone.'],
  post_boost: ['Your post is boosted! 🚀', 'It now shows as Promoted near the top of everyone\'s feed. Check its views from the 🚀 Boost button on the post.'],
  supporter_yearly: ["You're a Supporter for the year! ★", 'Every theme is unlocked, your Top 16 is ready, and you saved about 30% by going yearly. Thank you! 🧡'],
  gift_coins: ['Coins sent! 🪙🎁', 'Your fren just got the coins and a notification saying they were from you.'],
  username: ['New username! ✨', 'Your profile link has changed. Old links to your page still work.'],
  merch: ['Order placed! 👕', "Printful is making your merch now. It usually ships in 2 to 5 business days, and we'll send you a notification with tracking when it does."],
  sticker: ['Order placed! 📦', "Your stickers will be mailed to the address you entered. We'll send you a notification when they ship."],
  coins: ['Coins added! 🪙', 'Send gifts from the 🎁 button on posts, profiles and live streams.'],
};

export default async function SuccessPage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const id = String(sp?.session_id || '');

  let kind = null;
  let pending = false;
  if (id && stripeConfigured()) {
    try {
      const session = await stripe.getCheckoutSession(id);
      if (session?.metadata?.userId === me.id) {
        kind = await fulfillCheckout(session);
        pending = !kind;
      }
    } catch (err) {
      console.error('[success] lookup failed:', err);
      pending = true;
    }
  }
  const [title, text] = MESSAGES[kind] || [
    pending ? 'Payment processing…' : 'Thanks!',
    pending
      ? "Your payment is still being confirmed. It usually takes a few seconds. Refresh this page, or check back shortly."
      : 'Your purchase is complete.',
  ];

  return (
    <div className="box" style={{ maxWidth: 520, margin: '30px auto', textAlign: 'center' }}>
      <div className="box-b" style={{ padding: 32 }}>
        <h1 className="bigname" style={{ marginBottom: 8 }}>{title}</h1>
        <p className="muted">{text}</p>
        <div className="actions" style={{ justifyContent: 'center', marginTop: 18 }}>
          <Link href={`/${me.username}`} className="btn small-btn">View my profile</Link>
          <Link href="/shop" className="btn ghost small-btn">Back to the shop</Link>
        </div>
      </div>
    </div>
  );
}
