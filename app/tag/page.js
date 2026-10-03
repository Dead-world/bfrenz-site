import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cleanTag } from '@/lib/tags';
import { trendingTags } from '@/lib/mentions';

export const metadata = { title: 'Hashtags | BFRENZ.com', robots: { index: false } };

export default async function TagsPage({ searchParams }) {
  const sp = await searchParams;
  if (sp?.q) {
    const t = cleanTag(sp.q);
    if (t) redirect(`/tag/${t}`);
  }
  const trending = await trendingTags(40);
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 className="bigname"># Hashtags</h1>
      <form action="/tag" className="box">
        <div className="box-b actions">
          <input type="search" name="q" placeholder="Find a hashtag… e.g. newmusic" aria-label="Find a hashtag" style={{ flex: 1, minWidth: 180 }} defaultValue={sp?.q ? String(sp.q).slice(0, 41) : ''} />
          <button type="submit" className="btn small-btn">Go</button>
        </div>
        {sp?.q && !cleanTag(sp.q) && <div className="box-b small muted" style={{ paddingTop: 0 }}>Hashtags are letters, numbers and _ only, with at least one letter.</div>}
      </form>
      <div className="box">
        <div className="box-h">🔥 Trending this week</div>
        {trending.length === 0 ? (
          <div className="box-b small muted">Nothing trending yet. Add a #hashtag to a public post or a group post to start one!</div>
        ) : (
          <div className="box-b tag-chips">
            {trending.map((t) => (
              <Link key={t.tag} href={`/tag/${t.tag}`} className="tag-chip">
                #{t.tag} <span className="muted">{t.count}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <p className="small muted">Tip: type # in any post, like <b>#newmusic</b> or <b>#top8</b>, and it becomes a link to every post with that tag.</p>
    </div>
  );
}
