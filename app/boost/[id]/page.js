import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PRICES, money } from '@/lib/pricing';
import { loadReactions } from '@/lib/reactions';
import BuyButton from '@/components/BuyButton';
import Notice from '@/components/Notice';

export const metadata = { title: 'Boost your post | BFRENZ.com', robots: { index: false } };
export const dynamic = 'force-dynamic';

const BLURB = { 1: 'Quick bump', 3: 'Most popular', 7: 'Best value' };

/** Boost one of your posts: pick 1, 3 or 7 days, see how it's doing. */
export default async function BoostPage({ params, searchParams }) {
  const me = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const post = await prisma.post.findUnique({ where: { id: String(id).slice(0, 40) }, include: { _count: { select: { comments: true } } } });
  if (!post || post.authorId !== me.id) notFound();

  const live = post.boostUntil && post.boostUntil > new Date();
  const rx = (await loadReactions([`p-${post.id}`], me.id)).get(`p-${post.id}`);
  const preview = (post.body || (post.imageUrls.length ? '📸 Photo post' : post.songUrl ? '🎵 Song post' : '🎬 Video post')).slice(0, 200);
  const back = `/boost/${post.id}`;

  return (
    <div className="boost-page">
      <div className="small" style={{ marginBottom: 10 }}>
        <Link href={`/post/${post.id}`}>&laquo; Back to the post</Link>
      </div>
      <Notice sp={sp} />
      <div className="box">
        <div className="box-h">🚀 Boost your post</div>
        <div className="box-b">
          <blockquote className="boost-preview">{preview}</blockquote>
          <p className="muted">
            A boosted post shows up as <b>📣 Promoted</b> near the top of everyone&apos;s news feed on BFRENZ, not just your frenz.
            Great for a new song, a show, your business or a big announcement.
          </p>
          {live ? (
            <div className="boost-status on">
              <b>🟢 Boosted until {post.boostUntil.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</b>
              <span>👀 Shown {post.boostViews.toLocaleString('en-US')} times · 👍 {rx?.up || 0} likes · 💬 {post._count.comments} comments</span>
              <span className="small muted">Buy more days below to keep it going (they&apos;re added on to the end).</span>
            </div>
          ) : post.boostViews > 0 ? (
            <div className="boost-status">
              <b>Last boost: shown {post.boostViews.toLocaleString('en-US')} times</b>
              <span>👍 {rx?.up || 0} likes · 💬 {post._count.comments} comments</span>
            </div>
          ) : null}
          {post.visibility !== 'public' && (
            <p className="small boost-note">🌍 Boosting makes this post <b>public</b>, so everyone on BFRENZ can see it.</p>
          )}
          <div className="boost-options">
            {Object.entries(PRICES.postBoost).map(([days, cents]) => (
              <div key={days} className={`boost-option${days === '3' ? ' pick' : ''}`}>
                <span className="boost-tag">{BLURB[days]}</span>
                <b>{days} {days === '1' ? 'day' : 'days'}</b>
                <span className="boost-price">{money(cents)}</span>
                <BuyButton kind="post_boost" itemId={`${post.id}:${days}`} back={back} label={live ? 'Add days' : 'Boost'} />
              </div>
            ))}
          </div>
          <p className="small muted">
            Promoted posts follow the same rules as everything else on BFRENZ. Posts that break them are removed, and boosts aren&apos;t refunded.
          </p>
        </div>
      </div>
    </div>
  );
}
