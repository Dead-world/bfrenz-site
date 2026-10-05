import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PRICES, money } from '@/lib/pricing';
import { GIFTS, getGift } from '@/lib/gifts';
import { timeAgo } from '@/lib/util';
import BuyButton from '@/components/BuyButton';
import Notice from '@/components/Notice';
import { startCheckout } from '@/app/actions/shop';
import { inAndroidApp } from '@/lib/appMode';
import { HALLOWEEN } from '@/lib/cosmetics';

export const metadata = { title: 'Coins & Gifts | BFRENZ.com', robots: { index: false } };
export const dynamic = 'force-dynamic';

const WHO = { select: { username: true, displayName: true } };

/** Buy coins, see what gifts cost, and your gift history. */
export default async function CoinsPage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const [sent, got] = await Promise.all([
    prisma.gift.findMany({ where: { fromId: me.id }, orderBy: { createdAt: 'desc' }, take: 15, include: { to: WHO } }),
    prisma.gift.findMany({ where: { toId: me.id }, orderBy: { createdAt: 'desc' }, take: 15, include: { from: WHO } }),
  ]);
  const row = (g, who, verb) => {
    const gift = getGift(g.gift) || { emoji: '🎁', name: g.gift };
    return (
      <li key={g.id}>
        <span className="coin-hist-emoji">{gift.emoji}</span>
        <span>
          {verb} <b>{gift.name}</b> {verb === 'Sent' ? 'to' : 'from'} <Link href={`/${who.username}`}>{who.displayName}</Link>
          <span className="small muted"> · {timeAgo(g.createdAt)}</span>
        </span>
      </li>
    );
  };

  return (
    <div className="coins-page">
      <Notice sp={sp} />
      <div className="box coins-hero">
        <div className="coins-bal">🪙 <b>{me.coins.toLocaleString('en-US')}</b> <span>coins</span></div>
        <p className="muted">Send gifts on posts, profiles and live streams to show some love. Your fren gets a notification, and your gift shows on their post.</p>
      </div>

      <div className="box">
        <div className="box-h">Get coins</div>
        <div className="coin-packs">
          {PRICES.coinPacks.map((p) => (
            <div key={p.coins} className={`coin-pack${p.tag === 'Best value' ? ' best' : ''}`}>
              {p.tag && <span className="coin-tag">{p.tag}</span>}
              <span className="coin-amt">🪙 {p.coins.toLocaleString('en-US')}</span>
              <BuyButton kind="coins" itemId={String(p.coins)} back="/coins" label={money(p.cents)} />
            </div>
          ))}
        </div>
      </div>

      {!(await inAndroidApp()) && (
        <div className="box" id="send-coins">
          <div className="box-h">🎁 Send coins to a fren</div>
          <form action={startCheckout} className="box-b gift-coins-form">
            <input type="hidden" name="kind" value="gift_coins" />
            <input type="hidden" name="back" value="/coins#send-coins" />
            <p className="small muted" style={{ margin: 0 }}>Perfect for birthdays. They get the coins right away, plus a notification that it was from you.</p>
            <label>
              <span>Their username</span>
              <input name="to" defaultValue={sp?.to ? String(sp.to).slice(0, 20) : ''} placeholder="username" required autoCapitalize="none" autoCorrect="off" />
            </label>
            <label>
              <span>How many</span>
              <select name="pack" defaultValue="550">
                {PRICES.coinPacks.map((p) => <option key={p.coins} value={p.coins}>🪙 {p.coins.toLocaleString('en-US')} · {money(p.cents)}</option>)}
              </select>
            </label>
            <input type="hidden" name="itemId" value="" />
            <button type="submit" className="btn">Send coins</button>
          </form>
        </div>
      )}

      {Date.now() < Date.parse(HALLOWEEN.until) && (
        <Link href="/edit?tab=design#frame" className="season-banner" style={{ display: 'block' }}>
          <b>🎃 Halloween pack, on sale until Oct 31 only:</b> spooky frames, 🦇 bat trails, 👻 ghosts and 🎃 pumpkins falling on your page. Spend your coins &raquo;
        </Link>
      )}

      <div className="box">
        <div className="box-h">Gifts</div>
        <div className="gift-catalog">
          {GIFTS.map((g) => (
            <div key={g.slug} className="gift-cat">
              <span className="gx-emoji">{g.emoji}</span>
              <b>{g.name}</b>
              <span className="small muted">🪙 {g.coins}</span>
            </div>
          ))}
        </div>
        <p className="small muted box-b" style={{ margin: 0 }}>
          Tap <b>🎁 Gift</b> under any post, on someone&apos;s profile (&ldquo;Send a gift&rdquo;), or under a live stream.
        </p>
      </div>

      {(sent.length > 0 || got.length > 0) && (
        <div className="coin-hist-cols">
          <div className="box">
            <div className="box-h">Gifts you got</div>
            {got.length ? <ul className="coin-hist">{got.map((g) => row(g, g.from, 'Got'))}</ul> : <div className="box-b small muted">None yet.</div>}
          </div>
          <div className="box">
            <div className="box-h">Gifts you sent</div>
            {sent.length ? <ul className="coin-hist">{sent.map((g) => row(g, g.to, 'Sent'))}</ul> : <div className="box-b small muted">None yet.</div>}
          </div>
        </div>
      )}

      <p className="small muted coins-fine">
        Coins and gifts are for fun on BFRENZ: they have no cash value, can&apos;t be cashed out or transferred, and aren&apos;t refundable once sent.
        Purchases aren&apos;t available in the Android app.
      </p>
    </div>
  );
}
