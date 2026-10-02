import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { STAMPS, inSeason } from '@/lib/stamps';
import { ownedStampSlugs } from '@/lib/stampsDb';
import { isSupporter } from '@/lib/perks';
import { money } from '@/lib/pricing';
import StampCard from '@/components/StampCard';
import BuyButton from '@/components/BuyButton';
import Notice from '@/components/Notice';

export const metadata = {
  title: 'Stamps | BFRENZ.com',
  description: 'Collectible stamps BFRENZ members give each other. Collect them all.',
  alternates: { canonical: '/stamps' },
};

const SECTIONS = [
  ['free', 'Free stamps', 'Anyone can give these. One of each per person.'],
  ['seasonal', 'Seasonal stamps', 'Free, but only around for a limited time each year. Grab them while they last.'],
  ['rare', 'Rare stamps', 'Only Supporters can give these.'],
  ['shop', 'Limited stamps', `Buy once, give to as many frenz as you want. Supporters get these too.`],
];

export default async function StampsPage({ searchParams }) {
  const sp = await searchParams;
  const me = await getCurrentUser();
  const owned = await ownedStampSlugs(me?.id);
  const supporter = isSupporter(me);

  return (
    <div className="stamps-page">
      <div className="actions" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="bigname" style={{ margin: 0 }}>Stamps 🎟️</h1>
        {me && <Link href={`/${me.username}/stamps`} className="btn ghost small-btn">My collection</Link>}
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Give your frenz a stamp to show some love. It goes in their Stamp Collection on their profile. To give one,
        visit someone&apos;s page and hit <b>🎟️ Give a stamp</b>.
      </p>
      <Notice sp={sp} />

      {SECTIONS.map(([tier, title, blurb]) => (
        <section key={tier} className="box" id={tier}>
          <div className="box-h">{title}</div>
          <div className="box-b small muted" style={{ paddingBottom: 0 }}>{blurb}</div>
          <div className="stamp-grid">
            {STAMPS.filter((s) => s.tier === tier).map((s) => (
              <StampCard key={s.slug} stamp={s}>
                <span className="small muted stamp-blurb">{s.blurb}</span>
                {tier === 'shop' && (
                  owned.has(s.slug) ? (
                    <span className="small stamp-owned">✓ Yours</span>
                  ) : supporter ? (
                    <span className="small stamp-owned">✓ Included</span>
                  ) : me ? (
                    <BuyButton kind="stamp" itemId={s.slug} back="/stamps#shop" label={`Get it · ${money(s.price)}`} />
                  ) : null
                )}
                {tier === 'rare' && !supporter && (
                  <Link href="/shop#supporter" className="small">Become a Supporter</Link>
                )}
                {tier === 'seasonal' && (
                  <span className="small muted">{inSeason(s) ? '🟢 Available now' : 'Not in season'}</span>
                )}
              </StampCard>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
