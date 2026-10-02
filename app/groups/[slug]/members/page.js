import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getGroup, membershipOf, canModerate } from '@/lib/groups';
import { isAdmin } from '@/lib/moderation';
import { manageMember } from '@/app/actions/groups';
import { Pic } from '@/components/Avatar';
import Badges, { Name } from '@/components/Badges';
import Notice from '@/components/Notice';
import { fmtDay } from '@/lib/util';

export const metadata = { robots: { index: false } };

const RANK = { owner: 0, mod: 1, member: 2, banned: 3 };

function Action({ group, userId, action, label, back, danger }) {
  return (
    <form action={manageMember} className="inline">
      <input type="hidden" name="groupId" value={group.id} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="back" value={back} />
      <button type="submit" className={`linkbtn small${danger ? ' danger' : ''}`}>{label}</button>
    </form>
  );
}

export default async function GroupMembersPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const group = await getGroup(slug);
  const me = await getCurrentUser();
  if (!group || (group.owner.bannedAt && !isAdmin(me))) notFound();
  const mine = await membershipOf(group.id, me?.id);
  const mod = canModerate(me, mine);
  const owner = mine?.role === 'owner' || isAdmin(me);

  const rows = await prisma.groupMember.findMany({
    where: { groupId: group.id, user: { bannedAt: null }, ...(mod ? {} : { role: { not: 'banned' } }) },
    orderBy: { joinedAt: 'asc' },
    take: 1000,
    include: { user: true },
  });
  rows.sort((a, b) => RANK[a.role] - RANK[b.role]);
  const back = `/groups/${group.slug}/members`;

  return (
    <div className="group-members-page">
      <div className="small"><Link href={`/groups/${group.slug}`}>&laquo; {group.name}</Link></div>
      <h1 className="bigname">Members ({group.memberCount})</h1>
      <Notice sp={sp} />
      <div className="box">
        <ul className="member-list">
          {rows.map((r) => (
            <li key={r.id} className={r.role === 'banned' ? 'is-banned' : ''}>
              <Link href={`/${r.user.username}`}><Pic user={r.user} size={44} /></Link>
              <div className="member-main">
                <Link href={`/${r.user.username}`}><b><Name user={r.user} /></b></Link><Badges user={r.user} />
                {r.role !== 'member' && <span className="group-role">{r.role}</span>}
                <div className="small muted">joined {fmtDay(r.joinedAt)}</div>
              </div>
              {mod && r.role !== 'owner' && r.userId !== me.id && (
                <div className="member-actions actions">
                  {r.role === 'banned' ? (
                    <Action group={group} userId={r.userId} action="unban" label="Unban" back={back} />
                  ) : (
                    <>
                      {owner && r.role === 'member' && <Action group={group} userId={r.userId} action="mod" label="Make mod" back={back} />}
                      {owner && r.role === 'mod' && <Action group={group} userId={r.userId} action="unmod" label="Remove mod" back={back} />}
                      {mine?.role === 'owner' && <Action group={group} userId={r.userId} action="owner" label="Make owner" back={back} />}
                      {(owner || r.role === 'member') && <Action group={group} userId={r.userId} action="kick" label="Remove" back={back} />}
                      {(owner || r.role === 'member') && <Action group={group} userId={r.userId} action="ban" label="Ban" back={back} danger />}
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      {mod && <p className="small muted">Ban removes someone, deletes their posts in this group, and stops them from rejoining. &ldquo;Make owner&rdquo; hands the whole group to them (you become a mod).</p>}
    </div>
  );
}
