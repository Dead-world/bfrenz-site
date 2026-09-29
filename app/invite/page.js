import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { siteUrl } from '@/lib/email';
import { INVITE_REWARDS, inviteLink, inviteStats } from '@/lib/invites';
import { THEMES } from '@/lib/themes';
import { claimInviteReward } from '@/app/actions/invites';
import ShareButtons from '@/components/ShareButtons';
import Notice from '@/components/Notice';
import { FriendTile } from '@/components/Avatar';

export const metadata = { title: 'Invite Frenz | BFRENZ.com', robots: { index: false } };

export default async function InvitePage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const { invited, counted, claimed } = await inviteStats(me.id);
  const link = inviteLink(me, siteUrl());
  const profileLink = `${siteUrl()}/${me.username}`;
  const next = INVITE_REWARDS.find((r) => !claimed.has(r.tier) && counted < r.need);
  const premium = THEMES.filter((t) => t.price > 0);

  return (
    <div className="cols">
      <div className="col-right">
        <Notice sp={sp} />
        {sp?.claimed && <div className="notice ok">Reward unlocked! Enjoy. 🧡</div>}

        <div className="box orange">
          <div className="box-h orange">Invite your frenz</div>
          <div className="box-b">
            <p style={{ marginTop: 0 }}>
              Send this link. Everyone who signs up with it becomes your fren automatically, and you earn free stuff.
            </p>
            <ShareButtons url={link} text={`Come be my fren on BFRENZ! I'm @${me.username}`} />
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
