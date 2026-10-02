import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createGroup } from '@/app/actions/groups';
import GroupFields from '@/components/GroupFields';
import Notice from '@/components/Notice';

export const metadata = { title: 'Start a group | BFRENZ.com', robots: { index: false } };

export default async function NewGroupPage({ searchParams }) {
  await requireUser();
  const sp = await searchParams;
  return (
    <div className="group-form-page">
      <div className="small"><Link href="/groups">&laquo; Groups</Link></div>
      <h1 className="bigname">Start a group</h1>
      <Notice sp={sp} />
      <form action={createGroup} className="box">
        <div className="box-b">
          <GroupFields />
          <div className="actions" style={{ marginTop: 16 }}>
            <button type="submit" className="btn">Create group</button>
            <Link href="/groups" className="btn ghost">Cancel</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
