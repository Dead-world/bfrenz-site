import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isBlockedEither } from '@/lib/moderation';
import { isSupporter } from '@/lib/perks';
import { PRICES, money } from '@/lib/pricing';
import { Pic } from '@/components/Avatar';
import BuyButton from '@/components/BuyButton';
import Notice from '@/components/Notice';

export const metadata = { title: 'Gift Supporter | BFRENZ.com', robots: { index: false } };

export default async function GiftPage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const name = String(sp?.to || '').toLowerCase().slice(0, 40);
  const to = name ? await prisma.user.findUnique({ where: { username: name } }) : null;
  if (!to || to.bannedAt || to.id === me.id || (await isBlockedEither(me.id, to.id))) redirect('/shop#supporter');
  const back = `/gift?to=${to.username}`;

  return (
    <div className="gift-page">
      <div className="small"><Link href={`/${to.username}`}>&laquo; Back to {to.displayName}&apos;s page</Link></div>
      <Notice sp={sp} />
      <div className="box orange gift-card">
        <div className="gift-hero">
          <span className="gift-emoji">🎁</span>
          <Pic user={to} size={96} />
          <div>
            <h1 className="bigname" style={{ margin: 0 }}>Gift {to.displayName} Supporter</h1>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              They get a notification saying it&apos;s from you{isSupporter(to) ? ', and the time is added on top of what they already have' : ''}.
            </p>
          </div>
        </div>
        <div className="box-b">
          <ul className="perk-list">
            <li><b>Every premium theme</b> and <b>About Me template</b></li>
            <li>Gold <span className="badge badge-supporter">★</span> badge, Top 16, a custom name color</li>
            <li><b>Every name effect</b>, rare stamps and <b>who&apos;s been creeping</b></li>
            <li>No ads</li>
          </ul>
          <div className="gift-options">
            <div className="gift-option">
              <b>1 month</b>
              <span className="gift-price">{money(PRICES.giftSupporter[1])}</span>
              <BuyButton kind="gift_supporter" itemId={`${to.id}:1`} back={back} label="Send gift 🎁" />
            </div>
            <div className="gift-option best">
              <span className="gift-tag">Best value</span>
              <b>3 months</b>
              <span className="gift-price">{money(PRICES.giftSupporter[3])}</span>
              <BuyButton kind="gift_supporter" itemId={`${to.id}:3`} back={back} label="Send gift 🎁" />
            </div>
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>One-time payment. It never renews, so there&apos;s nothing for anyone to cancel.</p>
        </div>
      </div>
    </div>
  );
}
