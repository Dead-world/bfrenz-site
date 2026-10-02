import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { currentChampion, daysLeft, leaderboard, myVote, pastWinners, weekKey, weekLabel, shiftWeek } from '@/lib/potw';
import { unvotePotw } from '@/app/actions/potw';
import { prisma } from '@/lib/db';
import { Pic } from '@/components/Avatar';
import Badges, { Name } from '@/components/Badges';
import Notice from '@/components/Notice';

export const metadata = {
  title: 'Profile of the Week | BFRENZ.com',
  description: 'Vote for the best page on BFRENZ. The winner is featured for a whole week.',
  alternates: { canonical: '/potw' },
};

export default async function PotwPage({ searchParams }) {
  const sp = await searchParams;
  const me = await getCurrentUser();
  const week = weekKey();
  const [champ, board, mine, past] = await Promise.all([currentChampion(), leaderboard(week, 10), myVote(me?.id, week), pastWinners(9)]);
  const votedFor = mine ? await prisma.user.findUnique({ where: { id: mine.nomineeId }, select: { username: true, displayName: true } }) : null;
  const left = daysLeft();

  return (
    <div className="potw-page">
      <h1 className="bigname">🏆 Profile of the Week</h1>
      <Notice sp={sp} />

      {champ ? (
        <section className="box potw-champ">
          <div className="potw-crown">👑</div>
          <Link href={`/${champ.user.username}`}><Pic user={champ.user} size={120} /></Link>
          <div>
            <div className="small potw-kicker">This week&apos;s Profile of the Week</div>
            <h2 className="potw-name">
              <Link href={`/${champ.user.username}`}><Name user={champ.user} /></Link>
              <Badges user={champ.user} />
            </h2>
            {champ.user.headline && <div className="muted">&ldquo;{champ.user.headline}&rdquo;</div>}
            <div className="small muted">Won with {champ.votes} {champ.votes === 1 ? 'vote' : 'votes'} (week of {weekLabel(champ.week)})</div>
            <Link href={`/${champ.user.username}`} className="btn small-btn" style={{ marginTop: 10 }}>Visit their page &raquo;</Link>
          </div>
        </section>
      ) : (
        <section className="box"><div className="box-b">No winner yet. This week&apos;s top profile gets crowned on Monday!</div></section>
      )}

      <div className="cols">
        <div className="col-right">
          <section className="box">
            <div className="box-h">
              This week&apos;s votes
              <span className="right small">voting closes in {left} {left === 1 ? 'day' : 'days'}</span>
            </div>
            <div className="box-b small muted" style={{ paddingBottom: 0 }}>
              Vote from any member&apos;s profile with the <b>🏆 Vote</b> button. One vote per week; you can change it until Sunday night.
            </div>
            {board.length === 0 ? (
              <div className="box-b">No votes yet this week. Go vote for your favorite page!</div>
            ) : (
              <ol className="potw-board">
                {board.map((r, i) => (
                  <li key={r.user.id} className={i === 0 ? 'lead' : ''}>
                    <span className="potw-rank">{i + 1}</span>
                    <Link href={`/${r.user.username}`}><Pic user={r.user} size={40} /></Link>
                    <Link href={`/${r.user.username}`} className="potw-who"><b><Name user={r.user} /></b></Link>
                    <span className="potw-votes">{r.votes} {r.votes === 1 ? 'vote' : 'votes'}</span>
                  </li>
                ))}
              </ol>
            )}
            {me && (
              <div className="box-b small">
                {votedFor ? (
                  <form action={unvotePotw} className="actions">
                    <input type="hidden" name="back" value="/potw" />
                    <span>Your vote: <Link href={`/${votedFor.username}`}><b>{votedFor.displayName}</b></Link></span>
                    <button type="submit" className="linkbtn small muted">Take it back</button>
                  </form>
                ) : (
                  <>You haven&apos;t voted this week. Visit a profile you love and hit <b>🏆 Vote</b>.</>
                )}
              </div>
            )}
          </section>
        </div>
        <div className="col-left">
          <section className="box">
            <div className="box-h">Hall of Fame</div>
            {past.length === 0 ? (
              <div className="box-b small muted">The first winner gets crowned next Monday.</div>
            ) : (
              <ul className="potw-past">
                {past.map((w) => (
                  <li key={w.id}>
                    <Link href={`/${w.user.username}`}><Pic user={w.user} size={36} /></Link>
                    <span>
                      <Link href={`/${w.user.username}`}><Name user={w.user} /></Link>
                      <span className="small muted"> · week of {weekLabel(w.week)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="box-b small muted">Winners get a 🏆 banner on their page and the top spot on everyone&apos;s Feed for a week.</div>
          </section>
        </div>
      </div>
    </div>
  );
}
