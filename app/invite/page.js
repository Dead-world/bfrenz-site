import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { siteUrl } from '@/lib/email';
import { INVITE_COINS, INVITE_REWARDS, WELCOME_COINS, inviteLink, inviteStats } from '@/lib/invites';
import { CONTEST_MIN, CONTEST_PRIZES, contestLeaders, monthStart, myContestCount } from '@/lib/inviteContest';
import { FriendTile, Pic } from '@/components/Avatar';
import { THEMES } from '@/lib/themes';
import { claimInviteReward } from '@/app/actions/invites';
import ShareButtons from '@/components/ShareButtons';
import Notice from '@/components/Notice';

export const metadata = { title: 'Invite Frenz | BFRENZ.com', robots: { index: false } };

export default async function InvitePage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const { invited, counted, claimed } = await inviteStats(me.id);
  const link = inviteLink(me, siteUrl());
  const profileLink = `${siteUrl()}/${me.username}`;
  const next = INVITE_REWARDS.find((r) => !claimed.has(r.tier) && counted < r.need);
  const premium = THEMES.filter((t) => t.price > 0);
  const [leaders, mine] = await Promise.all([contestLeaders(monthStart(), 10), myContestCount(me.id)]);
  const myRank = leaders.findIndex((l) => l.user.id === me.id) + 1;
  const now = new Date();
  const daysLeft = Math.max(1, Math.ceil((monthStart(now, 1) - now) / 86400000));
  const monthName = now.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const coinsEarned = invited.filter((u) => u.inviteRewardPaid).length * INVITE_COINS;

  return (
    <div className="cols">
      <div className="col-right">
        <Notice sp={sp} />
        {sp?.claimed && <div className="notice ok">Reward unlocked! Enjoy. 🧡</div>}

        <div className="box invite-hero">
          <div className="invite-hero-top">
            <div className="invite-coin">🪙</div>
            <div>
              <div className="invite-kicker">INVITE &amp; EARN</div>
              <h1>Give 🪙{WELCOME_COINS}, get 🪙{INVITE_COINS}</h1>
              <p className="muted" style={{ margin: 0 }}>
                Your frenz get <b>{WELCOME_COINS} free coins</b> when they join with your link. You get <b>{INVITE_COINS} coins</b> for every one who adds a profile pic, and you&apos;re frenz right away.
              </p>
            </div>
          </div>
          <div className="invite-link-row" />
          <ShareButtons url={link} text={`Join me on BFRENZ and get ${WELCOME_COINS} free coins! I'm @${me.username} 🧡`} />
          <div className="invite-stats">
            <div><b>{invited.length}</b><span>joined</span></div>
            <div><b>{counted}</b><span>counted</span></div>
            <div><b>🪙 {coinsEarned.toLocaleString('en-US')}</b><span>coins earned</span></div>
          </div>
        </div>

        <div className="box contest-box" id="contest">
          <div className="box-h">
            🏆 {monthName} invite contest
            <span className="right small">{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</span>
          </div>
          <div className="box-b">
            <div className="contest-prizes">
              {CONTEST_PRIZES.map((p) => <div key={p.rank}>{p.label}</div>)}
            </div>
            <p className="small muted" style={{ margin: '8px 0 12px' }}>
              Most frenz who join with your link (and add a pic) this month wins. Need at least {CONTEST_MIN} to place. Prizes are paid automatically on the 1st.
            </p>
            {leaders.length === 0 ? (
              <div className="small muted">Nobody&apos;s on the board yet this month. Invite 3 frenz and you could be #1!</div>
            ) : (
              <ol className="contest-list">
                {leaders.map((l, i) => (
                  <li key={l.user.id} className={l.user.id === me.id ? 'me' : ''}>
                    <span className="contest-rank">{i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}</span>
                    <Link href={`/${l.user.username}`}><Pic user={l.user} size={34} /></Link>
                    <Link href={`/${l.user.username}`} className="contest-name">{l.user.displayName}</Link>
                    <b>{l.count}</b>
                  </li>
                ))}
              </ol>
            )}
            <p className="small" style={{ marginBottom: 0 }}>
              You: <b>{mine}</b> this month{myRank ? <> · ranked <b>#{myRank}</b></> : ''}.
              {leaders[0] && leaders[0].user.id !== me.id && <> {Math.max(1, leaders[0].count - mine + 1)} more to take 1st!</>}
            </p>
          </div>
        </div>

        <div className="box">
          <div className="box-h">
            Your rewards
            <span className="right">{counted} {counted === 1 ? 'invite' : 'invites'} counted</span>
          </div>
          <div className="box-b">
            {next && (
              <div className="invite-progress" aria-label={`${counted} of ${next.need} invites`}>
                <div style={{ width: `${Math.min(100, (counted / next.need) * 100)}%` }} />
              </div>
            )}
            {next && (
              <p className="small muted">
                {next.need - counted} more to unlock <b>{next.title.toLowerCase()}</b>.
              </p>
            )}
            <div className="reward-list">
              {INVITE_REWARDS.map((r) => {
                const done = claimed.has(r.tier);
                const ready = !done && counted >= r.need;
                return (
                  <div key={r.tier} className={`reward${done ? ' done' : ready ? ' ready' : ''}`}>
                    <div className="reward-ico">{r.icon}</div>
                    <div className="reward-body">
                      <b>{r.title}</b>
                      <div className="small muted">Invite {r.need} frenz</div>
                    </div>
                    <div>
                      {done ? (
                        <span className="small"><b>✓ Claimed</b></span>
                      ) : ready ? (
                        <form action={claimInviteReward} className="actions">
                          <input type="hidden" name="tier" value={r.tier} />
                          {r.tier === 'theme' && (
                            <select name="slug" required defaultValue="">
                              <option value="" disabled>Pick a theme…</option>
                              {premium.map((t) => (
                                <option key={t.slug} value={t.slug}>{t.name}</option>
                              ))}
                            </select>
                          )}
                          <button className="btn small-btn" type="submit">Claim</button>
                        </form>
                      ) : (
                        <span className="small muted">{counted}/{r.need}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="small muted" style={{ marginBottom: 0 }}>
              An invite counts once your fren signs up with your link <b>and adds a profile pic</b>.
            </p>
          </div>
        </div>
      </div>

      <div className="col-left">
        <div className="box">
          <div className="box-h">Share your profile</div>
          <div className="box-b">
            <ShareButtons url={profileLink} text={`Check out my BFRENZ page!`} />
          </div>
        </div>
        <div className="box">
          <div className="box-h">People you invited ({invited.length})</div>
          {invited.length === 0 ? (
            <div className="box-b small muted">Nobody yet. Send your link to a few frenz!</div>
          ) : (
            <div className="top8" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {invited.filter((u) => !u.bannedAt).slice(0, 30).map((u) => (
                <div key={u.id}>
                  <FriendTile user={u} size={60} />
                  {!u.avatarUrl && <div className="small muted" style={{ textAlign: 'center' }}>needs a pic</div>}
                </div>
              ))}
            </div>
          )}
          <div className="box-b small" style={{ paddingTop: 0 }}>
            <Link href="/shop">Browse the shop &raquo;</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
