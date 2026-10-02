import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getGroup, membershipOf, canModerate } from '@/lib/groups';
import { isAdmin } from '@/lib/moderation';
import { updateGroup, deleteGroup } from '@/app/actions/groups';
import GroupFields from '@/components/GroupFields';
import Notice from '@/components/Notice';

export const metadata = { title: 'Group settings | BFRENZ.com', robots: { index: false } };

export default async function EditGroupPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const me = await requireUser();
  const group = await getGroup(slug);
  if (!group) notFound();
  const m = await membershipOf(group.id, me.id);
  if (!canModerate(me, m)) redirect(`/groups/${group.slug}`);
  const owner = group.ownerId === me.id || isAdmin(me);

  return (
    <div className="group-form-page">
      <div className="small"><Link href={`/groups/${group.slug}`}>&laquo; {group.name}</Link></div>
      <h1 className="bigname">Group settings</h1>
      <Notice sp={sp} />
      <form action={updateGroup} className="box">
        <input type="hidden" name="groupId" value={group.id} />
        <div className="box-b">
          <GroupFields group={group} />
          <div className="small muted" style={{ marginTop: 8 }}>The group&apos;s link stays bfrenz.com/groups/{group.slug} even if you rename it.</div>
          <div className="actions" style={{ marginTop: 16 }}>
            <button type="submit" className="btn">Save</button>
            <Link href={`/groups/${group.slug}/members`} className="btn ghost">Manage members</Link>
          </div>
        </div>
      </form>

      {owner && (
        <form action={deleteGroup} className="box danger-zone">
          <input type="hidden" name="groupId" value={group.id} />
          <div className="box-h">Delete this group</div>
          <div className="box-b">
            <p className="small">This deletes the group and every post in it for good. Type <b>{group.name}</b> to confirm.</p>
            <div className="actions">
              <input name="confirm" placeholder={group.name} autoComplete="off" aria-label="Type the group name to confirm" />
              <button type="submit" className="btn ghost small-btn">Delete group</button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
