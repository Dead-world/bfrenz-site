import Link from 'next/link';
import HeaderHeight from '@/components/HeaderHeight';

/** Category links at the top of the shop. Stays on screen while you scroll. */
export default function ShopNav({ merch = false, me = null }) {
  const items = [
    ['⭐', 'Supporter', '#supporter'],
    ['👕', 'Merch', merch ? '#merch-shop' : '/merch'],
    ['📦', 'Stickers', '#stickers'],
    ['🪙', 'Coins & Gifts', '/coins'],
    ['🖼️', 'Frames & Effects', me ? '/edit?tab=design#frame' : '/signup'],
    ['✨', 'Name Effects', '#name-effects'],
    ['🎨', 'Themes', '#themes'],
    ['📝', 'About Me', '#about'],
    ['🎟️', 'Stamps', '/stamps'],
    ['🚀', 'Get Noticed', '#boosts'],
    ['🧡', 'Tip Jar', '#tip'],
  ];
  return (
    <nav className="shop-nav" aria-label="Shop categories">
      <HeaderHeight />
      {items.map(([icon, label, href]) =>
        href.startsWith('#') ? (
          <a key={label} href={href} className="shop-cat"><span aria-hidden="true">{icon}</span>{label}</a>
        ) : (
          <Link key={label} href={href} className="shop-cat"><span aria-hidden="true">{icon}</span>{label}<span className="shop-cat-go" aria-hidden="true">›</span></Link>
        ),
      )}
    </nav>
  );
}
