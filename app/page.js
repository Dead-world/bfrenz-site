import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { FriendTile } from '@/components/Avatar';
import LoginBox from '@/components/LoginBox';

export default async function Splash() {
  if (await getCurrentUser()) redirect('/home');

  const [coolNew, memberCount] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.user.count(),
  ]);

  return (
    <div className="cols">
      <div className="col-right">
        <div className="splash-hero">
          <h1>
            Where your <em>frenz</em>
            <br />
            are at.
          </h1>
          <div className="muted">Your page, your Top 8, your song. Free forever.</div>
          <ul>
            <li>Get your own page at bfrenz.com/you and style it any way you want</li>
            <li>Show off your Top 8</li>
            <li>Put your favorite song on your profile</li>
            <li>Post bulletins, leave comments, send messages</li>
            <li>Share your photos</li>
          </ul>
          <div className="actions" style={{ marginTop: 22 }}>
            <Link href="/signup" className="btn">Create your page</Link>
            <Link href="/browse" className="btn ghost">Browse people</Link>
          </div>
        </div>

        <div className="box">
          <div className="box-h">Cool New People</div>
          {coolNew.length === 0 ? (
            <div className="box-b">Nobody here yet &mdash; be the first!</div>
          ) : (
            <div className="people-grid">
              {coolNew.map((u) => (
                <FriendTile key={u.id} user={u} size={80} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="col-left" style={{ width: 300 }}>
        <LoginBox />
        <div className="box">
          <div className="box-h">BFRENZ Stats</div>
          <div className="box-b">
            <b>{memberCount.toLocaleString()}</b> {memberCount === 1 ? 'member' : 'members'} and counting!
          </div>
        </div>
      </div>
    </div>
  );
}
