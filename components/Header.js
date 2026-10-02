import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/moderation';
import MobileMenu from '@/components/MobileMenu';

export default async function Header() {
  const me = await getCurrentUser();
  let unread = 0;
  let pending = 0;
  let reports = 0;
  const admin = isAdmin(me);
  if (admin) reports = await prisma.report.count({ where: { status: 'OPEN' } });
  if (me) {
    [unread, pending] = await Promise.all([
      prisma.message.count({ where: { recipientId: me.id, read: false, recipientDeleted: false } }),
      prisma.friendship.count({ where: { addresseeId: me.id, status: 'PENDING' } }),
    ]);
  }

  // One list of links: shown as the menu bar on computers and inside the ☰ menu on phones.
  const links = me
    ? [
        { href: '/home', label: 'Feed', icon: '📰' },
        { href: '/dashboard', label: 'Dashboard', icon: '☰' },
        { href: `/${me.username}`, label: 'Profile', icon: '👤' },
        { href: `/${me.username}/friends`, label: 'Friends', icon: '★' },
        { href: `/${me.username}/photos`, label: 'Photos', icon: '📷' },
        { href: `/${me.username}/videos`, label: 'Videos', icon: '🎬' },
        { href: '/bulletins', label: 'Bulletins', icon: '📢' },
        { href: '/groups', label: 'Groups', icon: '👥' },
        { href: '/blog', label: 'Blogs', icon: '✍️' },
        { href: '/surveys', label: 'Surveys', icon: '📝' },
        { href: '/potw', label: 'Top Profile', icon: '🏆' },
        { href: '/mail', label: 'Mail', icon: '✉', count: unread },
        { href: '/browse', label: 'Browse', icon: '🔍' },
        { href: '/edit', label: 'Edit Profile', icon: '✎' },
        { href: '/shop', label: 'Shop', icon: '🛍' },
        { href: '/invite', label: 'Invite', icon: '✦' },
        { href: '/app', label: 'Get the app', icon: '📲' },
        ...(pending > 0 ? [{ href: '/requests', label: 'Friend Requests', icon: '➕', count: pending, alert: true }] : []),
        ...(admin ? [{ href: '/admin', label: 'Admin', icon: '🛡', count: reports, alert: reports > 0 }] : []),
      ]
    : [
        { href: '/', label: 'Home', icon: '🏠' },
        { href: '/browse', label: 'Browse', icon: '🔍' },
        { href: '/shop', label: 'Shop', icon: '🛍' },
        { href: '/app', label: 'Get the app', icon: '📲' },
        { href: '/help', label: 'Help', icon: '?' },
        { href: '/login', label: 'Log in', icon: '→' },
        { href: '/signup', label: 'Join free', icon: '✦', alert: true },
      ];

  return (
    <header>
      <div className="topbar">
        <Link href={me ? '/home' : '/'} className="logo" aria-label="BFRENZ home">
          <img src="/logo.png" alt="bfrenz" width={198} height={60} />
        </Link>
        <form action="/browse" className="topsearch">
          <input name="q" placeholder="Find your frenz…" aria-label="Search people" />
          <button type="submit">Search</button>
        </form>
        <div className="toplinks">
          {me ? (
            <form action="/logout" method="post" className="inline">
              <button type="submit" className="linkbtn">Sign out</button>
            </form>
          ) : (
            <span className="actions">
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="btn small-btn">Join free</Link>
            </span>
          )}
        </div>
        <MobileMenu links={links} alerts={unread + pending} />
      </div>
      <nav className="navbar">
        {links
          .filter((l) => me || !['/login', '/signup'].includes(l.href))
          .map((l) => (
            <Link key={l.href + l.label} href={l.href} className={l.alert ? 'alert-link' : ''}>
              {l.label}
              {l.count > 0 ? ` (${l.count})` : ''}
            </Link>
          ))}
      </nav>
    </header>
  );
}
