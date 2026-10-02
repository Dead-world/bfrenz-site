import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/moderation';
import Icon from '@/components/Icon';
import NavBar from '@/components/NavBar';
import AccountMenu from '@/components/AccountMenu';
import MobileMenu from '@/components/MobileMenu';

/**
 * Site header. One description of the menu feeds three places:
 *  - the main tab bar + "More" panel on computers (NavBar)
 *  - the account menu under your picture (AccountMenu)
 *  - the ☰ panel on phones (MobileMenu)
 */
export default async function Header() {
  const me = await getCurrentUser();
  const admin = isAdmin(me);
  let unread = 0;
  let pending = 0;
  let reports = 0;
  if (me) {
    [unread, pending, reports] = await Promise.all([
      prisma.message.count({ where: { recipientId: me.id, read: false, recipientDeleted: false } }),
      prisma.friendship.count({ where: { addresseeId: me.id, status: 'PENDING' } }),
      admin ? prisma.report.count({ where: { status: 'OPEN' } }) : 0,
    ]);
  }

  const u = me?.username;
  const primary = me
    ? [
        { href: '/home', label: 'Feed', icon: 'feed' },
        { href: `/${u}`, label: 'Profile', icon: 'user', exact: true },
        { href: `/${u}/friends`, label: 'Friends', icon: 'users' },
        { href: '/groups', label: 'Groups', icon: 'group' },
        { href: '/creators', label: 'Creators', icon: 'video' },
        { href: '/blog', label: 'Blogs', icon: 'pen' },
      ]
    : [
        { href: '/', label: 'Home', icon: 'home', exact: true },
        { href: '/browse', label: 'Browse', icon: 'search' },
        { href: '/creators', label: 'Creators', icon: 'video' },
        { href: '/groups', label: 'Groups', icon: 'group' },
        { href: '/shop', label: 'Shop', icon: 'bag' },
      ];

  const groups = me
    ? [
        {
          title: 'You',
          items: [
            { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
            { href: `/${u}/photos`, label: 'Photos', icon: 'camera' },
            { href: `/${u}/videos`, label: 'Videos', icon: 'video' },
            { href: `/${u}/blog`, label: 'My blog', icon: 'pen' },
            { href: `/${u}/stamps`, label: 'My stamps', icon: 'ticket' },
            ...(me.creatorType ? [{ href: '/creator/stats', label: 'Creator stats', icon: 'chart' }] : []),
          ],
        },
        {
          title: 'Community',
          items: [
            { href: '/bulletins', label: 'Bulletins', icon: 'megaphone' },
            { href: '/surveys', label: 'Surveys', icon: 'survey' },
            { href: '/potw', label: 'Profile of the Week', icon: 'trophy' },
            { href: '/stamps', label: 'Stamps', icon: 'ticket' },
            { href: '/browse', label: 'Browse people', icon: 'search' },
          ],
        },
        {
          title: 'Extras',
          items: [
            { href: '/shop', label: 'Shop', icon: 'bag' },
            { href: '/invite', label: 'Invite frenz', icon: 'gift' },
            { href: '/app', label: 'Get the app', icon: 'phone' },
            { href: '/help', label: 'Help', icon: 'help' },
          ],
        },
      ]
    : [
        {
          title: 'Explore',
          items: [
            { href: '/blog', label: 'Blogs', icon: 'pen' },
            { href: '/surveys', label: 'Surveys', icon: 'survey' },
            { href: '/potw', label: 'Profile of the Week', icon: 'trophy' },
            { href: '/stamps', label: 'Stamps', icon: 'ticket' },
          ],
        },
        {
          title: 'More',
          items: [
            { href: '/app', label: 'Get the app', icon: 'phone' },
            { href: '/help', label: 'Help', icon: 'help' },
          ],
        },
      ];

  const account = me
    ? [
        { href: `/${u}`, label: 'View my profile', icon: 'user' },
        { href: '/edit', label: 'Edit profile', icon: 'pen' },
        { href: '/edit?tab=creator', label: me.creatorType ? 'Creator settings' : 'Turn on creator mode', icon: 'video' },
        { href: '/edit?tab=notify', label: 'Notifications', icon: 'bell' },
        { href: '/blocked', label: 'Blocked members', icon: 'block' },
        ...(admin ? [{ href: '/admin', label: 'Admin', icon: 'shield', count: reports }] : []),
      ]
    : [];

  const meInfo = me ? { name: me.displayName, username: me.username, pic: me.avatarUrl || '/no-pic.svg' } : null;

  return (
    <header>
      <div className="topbar">
        <Link href={me ? '/home' : '/'} className="logo" aria-label="BFRENZ home">
          <img src="/logo.png" alt="bfrenz" width={198} height={60} />
        </Link>
        <form action="/browse" className="topsearch">
          <Icon name="search" size={16} className="topsearch-ico" />
          <input name="q" placeholder="Find your frenz…" aria-label="Search people" />
        </form>
        <div className="top-actions">
          {me ? (
            <>
              <Link href="/mail" className="top-icon" title="Mail" aria-label={`Mail${unread ? `, ${unread} unread` : ''}`}>
                <Icon name="mail" size={20} />
                {unread > 0 && <span className="top-badge">{unread > 9 ? '9+' : unread}</span>}
              </Link>
              <Link href="/requests" className="top-icon" title="Friend requests" aria-label={`Friend requests${pending ? `, ${pending} new` : ''}`}>
                <Icon name="userplus" size={20} />
                {pending > 0 && <span className="top-badge">{pending > 9 ? '9+' : pending}</span>}
              </Link>
              {admin && reports > 0 && (
                <Link href="/admin" className="top-icon" title="Open reports" aria-label={`${reports} open reports`}>
                  <Icon name="shield" size={20} />
                  <span className="top-badge">{reports > 9 ? '9+' : reports}</span>
                </Link>
              )}
              <AccountMenu me={meInfo} items={account} />
            </>
          ) : (
            <span className="actions">
              <Link href="/login" className="top-login">Log in</Link>
              <Link href="/signup" className="btn small-btn">Join free</Link>
            </span>
          )}
          <MobileMenu me={meInfo} primary={primary} groups={groups} account={account} alerts={unread + pending} />
        </div>
      </div>
      <NavBar primary={primary} groups={groups} />
    </header>
  );
}
