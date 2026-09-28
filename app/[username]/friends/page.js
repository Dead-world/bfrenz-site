import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getFriendIds } from '@/lib/friends';
import { FriendTile } from '@/components/Avatar';
import { removeFriend } from '@/app/actions/friends';

const PER_PAGE = 40;

export async function generateMetadata({ params }) {
  const { username } = await params;
  return { title: `${username}'s friends | BFRENZ.com` };
}

export default async function FriendsPage({ params, searchParams }) {
  const { username } = await params;
  const sp = await searchParams;
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!user) notFound();
  const me = await getCurrentUser();
  const isMe = me?.id === user.id;

  const page = Math.max(1, parseInt(sp?.page || '1', 10) || 1);
  const ids = await getFriendIds(user.id);
  const friends = await prisma.user.findMany({
    where: { id: { in: ids } },
    orderBy: { displayName: 'asc' },
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
  });
  const pages = Math.max(1, Math.ceil(ids.length / PER_PAGE));
  const back = `/${user.username}/friends${page > 1 ? `?page=${page}` : ''}`;

  return (
    <div className="box">
      <div className="box-h">
        {user.displayName}&apos;s Friends ({ids.length})
        <Link href={`/${user.username}`} className="right">&laquo; Back to profile</Link>
      </div>
      {friends.length === 0 ? (
        <div className="box-b muted">No frenz yet.</div>
      ) : (
        <div className="people-grid">
          {friends.map((f) => (
            <div key={f.id}>
              <FriendTile user={f} />
              {isMe && (
                <form action={removeFriend} style={{ textAlign: 'center', marginTop: 4 }}>
                  <input type="hidden" name="userId" value={f.id} />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className="linkbtn small muted">Remove</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="pager">
          {page > 1 && <Link href={`/${user.username}/friends?page=${page - 1}`}>&laquo; Prev</Link>}
          <span className="muted">Page {page} of {pages}</span>
          {page < pages && <Link href={`/${user.username}/friends?page=${page + 1}`}>Next &raquo;</Link>}
        </div>
      )}
    </div>
  );
}
