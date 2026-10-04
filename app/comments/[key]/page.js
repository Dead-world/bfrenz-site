import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { isAdmin, hiddenUserIds } from '@/lib/moderation';
import { resolveTarget } from '@/lib/feedTargets';
import { ITEM_COMMENT_KINDS, keyKind } from '@/lib/feedKeys';
import { allItemComments } from '@/lib/itemComments';
import { loadReactions } from '@/lib/reactions';
import { ItemThread } from '@/components/FeedItem';
import LikeBar from '@/components/LikeBar';
import Notice from '@/components/Notice';

export const metadata = { title: 'Comments | BFRENZ.com', robots: { index: false } };

/** Every comment on one news-feed item (bulletin, photos, video, profile song, survey or new frenz). */
export default async function ItemCommentsPage({ params, searchParams }) {
  const me = await requireUser();
  const { key: raw } = await params;
  const sp = await searchParams;
  const key = decodeURIComponent(raw);
  const t = await resolveTarget(me, key);
  if (!t) notFound();
  // Posts, blogs and group posts have their own pages and comments.
  if (!ITEM_COMMENT_KINDS.includes(keyKind(key))) redirect(t.url);

  const [cm, rx] = await Promise.all([allItemComments(key, await hiddenUserIds(me.id)), loadReactions([key], me.id)]);
  const back = `/comments/${key}`;
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="small" style={{ marginBottom: 10 }}>
        <Link href="/home">&laquo; Back to your feed</Link>
      </div>
      <Notice sp={sp} />
      <article className="box feed-item feed-event" id={key}>
        <header className="feed-head">
          <div className="feed-head-main">
            <div>
              Comments on <b>{t.ownerName}</b>&apos;s {t.what}
            </div>
            <Link href={t.url} className="small">See it &raquo;</Link>
          </div>
        </header>
        <footer className="feed-actions">
          <LikeBar k={key} rx={rx.get(key)} />
          <a href={`#c-${key}`} className="linkbtn small">💬 Comment{cm.count ? ` · ${cm.count}` : ''}</a>
        </footer>
        <ItemThread k={key} cm={cm} me={me} back={back} admin={isAdmin(me)} owners={t.owners} all />
      </article>
    </div>
  );
}
