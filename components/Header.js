import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function Header() {
  const me = await getCurrentUser();
  let unread = 0;
  let pending = 0;
  if (me) {
    [unread, pending] = await Promise.all([
      prisma.message.count({ where: { recipientId: me.id, read: false, recipientDeleted: false } }),
      prisma.friendship.count({ where: { addresseeId: me.id, status: 'PENDING' } }),
    ]);
  }

  return (
    <header>
      <div className="topbar">
        <Link href="/" className="logo">
          bfrenz<span>.com</span>
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
      </div>
      <nav className="navbar">
        {me ? (
          <>
            <Link href="/home">Home</Link>
            <Link href={`/${me.username}`}>Profile</Link>
            <Link href={`/${me.username}/friends`}>Friends</Link>
            <Link href={`/${me.username}/photos`}>Photos</Link>
            <Link href="/bulletins">Bulletins</Link>
            <Link href="/mail">Mail{unread > 0 ? ` (${unread})` : ''}</Link>
            <Link href="/browse">Browse</Link>
            <Link href="/edit">Edit Profile</Link>
            {pending > 0 && (
              <Link href="/requests" className="alert-link">Friend Requests ({pending})</Link>
            )}
          </>
        ) : (
          <>
            <Link href="/">Home</Link>
            <Link href="/browse">Browse</Link>
            <Link href="/help">Help</Link>
          </>
        )}
      </nav>
    </header>
  );
}
