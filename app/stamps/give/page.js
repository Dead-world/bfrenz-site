import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { STAMPS, NOTE_MAX, canGive } from '@/lib/stamps';
import { ownedStampSlugs } from '@/lib/stampsDb';
import { isSupporter } from '@/lib/perks';
import { isBlockedEither } from '@/lib/moderation';
import { giveStamp } from '@/app/actions/stamps';
import { Pic } from '@/components/Avatar';
import Notice from '@/components/Notice';

export const metadata = { title: 'Give a stamp | BFRENZ.com', robots: { index: false } };

export default async function GiveStampPage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const toName = String(sp?.to || '').toLowerCase().slice(0, 40);
  const to = toName ? await prisma.user.findUnique({ where: { username: toName } }) : null;
  if (!to || to.bannedAt || to.id === me.id || (await isBlockedEither(me.id, to.id))) redirect('/stamps');

  const [owned, already] = await Promise.all([
    ownedStampSlugs(me.id),
    prisma.stampGift.findMany({ where: { fromId: me.id, toId: to.id }, select: { stampSlug: true } }),
  ]);
  const given = new Set(already.map((g) => g.stampSlug));
  const supporter = isSupporter(me);

  return (
    <div className="stamps-page">
      <div className="small"><Link href={`/${to.username}`}>&laquo; Back to {to.displayName}&apos;s page</Link></div>
      <div className="give-head">
        <Pic user={to} size={56} />
        <h1 className="bigname" style={{ margin: 0 }}>Give {to.displayName} a stamp</h1>
      </div>
      <Notice sp={sp} />
      <form action={giveStamp} className="box">
        <input type="hidden" name="to" value={to.username} />
        <div className="stamp-grid stamp-pick">
          {STAMPS.map((s) => {
            const can = canGive(s, { supporter, owned });
            const done = given.has(s.slug);
            const disabled = !can.ok || done;
            return (
              <label key={s.slug} className={`stamp-option${disabled ? ' off' : ''}`} title={done ? `You already gave this one` : can.ok ? s.blurb : can.why}>
                <input type="radio" name="stamp" value={s.slug} disabled={disabled} required />
                <img src={`/stamps/${s.slug}.svg`} alt={s.name} width={84} height={105} loading="lazy" />
                <span className="small"><b>{s.name}</b></span>
                <span className="small muted">{done ? '✓ Given' : can.ok ? '' : s.tier === 'shop' ? 'Shop' : s.tier === 'rare' ? 'Supporters' : 'Not in season'}</span>
              </label>
            );
          })}
        </div>
        <div className="box-b">
          <label className="blog-label" htmlFor="sn">Add a note <span className="muted small">(optional)</span></label>
          <input id="sn" type="text" name="note" maxLength={NOTE_MAX} placeholder={`Why ${to.displayName} deserves it…`} style={{ width: '100%' }} />
          <div className="actions" style={{ marginTop: 12 }}>
            <button type="submit" className="btn">🎟️ Give stamp</button>
            <Link href="/stamps" className="small">See all stamps</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
