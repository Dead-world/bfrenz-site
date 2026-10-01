import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { isSupporter } from '@/lib/perks';
import { COUNTER_STYLES, counterStyle, recentVisitors, visitorCount } from '@/lib/visitors';
import { saveVisitorSettings } from '@/app/actions/visitors';
import { Pic } from '@/components/Avatar';
import Badges, { Name } from '@/components/Badges';
import HitCounter from '@/components/HitCounter';
import Notice from '@/components/Notice';
import { timeAgo } from '@/lib/util';

export const metadata = { title: "Who's Been Creeping | BFRENZ.com", robots: { index: false } };

export default async function VisitorsPage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const supporter = isSupporter(me);
  const [visitors, week] = await Promise.all([supporter ? recentVisitors(me.id, 20) : [], visitorCount(me.id, 7)]);
  const look = counterStyle(me);

  return (
    <div className="visitors-page">
      <h1 className="bigname">Who&apos;s been creeping? 👀</h1>
      <Notice sp={sp} />

      <div className="cols">
        <div className="col-left">
          <div className="box">
            <div className="box-h">Your hit counter</div>
            <div className="box-b">
              <HitCounter value={me.profileViews} look={look} />
              <p className="small muted">
                <b>{week}</b> {week === 1 ? 'member' : 'different members'} visited your page in the last 7 days.
              </p>
              <form action={saveVisitorSettings} className="visitor-settings">
                <label className="check">
                  <input type="checkbox" name="showCounter" defaultChecked={me.showCounter} /> Show the hit counter on my profile
                </label>
                <div className="small" style={{ margin: '10px 0 6px' }}><b>Counter style</b></div>
                <div className="hc-picker">
                  {COUNTER_STYLES.map(([k, label]) => (
                    <label key={k} className="hc-option">
                      <input type="radio" name="counterStyle" value={k} defaultChecked={k === look} />
                      <HitCounter value={me.profileViews} look={k} label={false} />
                      <span className="small">{label}</span>
                    </label>
                  ))}
                </div>
                <label className="check" style={{ marginTop: 12 }}>
                  <input type="checkbox" name="privateBrowsing" defaultChecked={me.privateBrowsing} /> Private browsing
                </label>
                <div className="small muted" style={{ margin: '2px 0 12px 24px' }}>
                  Your visits still count toward people&apos;s hit counters, but your name won&apos;t show on their list.
                </div>
                <button className="btn small-btn" type="submit">Save</button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-right">
          <div className="box">
            <div className="box-h">Recent visitors</div>
            {supporter ? (
              visitors.length === 0 ? (
                <div className="box-b small muted">
                  No visitors to show yet. <Link href="/invite">Share your page</Link> to get some!
                </div>
              ) : (
                <ul className="visitor-list">
                  {visitors.map((v) => (
                    <li key={v.id}>
                      <Link href={`/${v.visitor.username}`}><Pic user={v.visitor} size={44} /></Link>
                      <div>
                        <Link href={`/${v.visitor.username}`}><b><Name user={v.visitor} /></b></Link>
                        <Badges user={v.visitor} />
                        <div className="small muted">visited {timeAgo(v.at)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="box-b">
                <div className="visitor-teaser" aria-hidden="true">
                  {Array.from({ length: Math.min(Math.max(week, 3), 6) }).map((_, i) => (
                    <div key={i} className="teaser-row">
                      <span className="teaser-pic" />
                      <span className="teaser-name" style={{ width: `${45 + ((i * 17) % 35)}%` }} />
                    </div>
                  ))}
                </div>
                <p>
                  {week > 0 ? (
                    <><b>{week}</b> {week === 1 ? 'person' : 'people'} checked out your page this week. Want to know who?</>
                  ) : (
                    <>See exactly who visits your page.</>
                  )}
                </p>
                <Link href="/shop#supporter" className="btn">★ Become a Supporter to see them</Link>
                <p className="small muted" style={{ marginBottom: 0 }}>
                  Or get Supporter free by <Link href="/invite">inviting frenz</Link>.
                </p>
              </div>
            )}
            <div className="box-b small muted" style={{ borderTop: '1px solid var(--line, #333)' }}>
              Members with private browsing on, and anyone you blocked, never show here.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
