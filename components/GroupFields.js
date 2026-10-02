import { GROUP_CATEGORIES, GROUP_DESC_MAX, GROUP_NAME_MAX } from '@/lib/groups';
import UploadField from '@/components/UploadField';

/** Name, category, description and picture fields for creating or editing a group. */
export default function GroupFields({ group }) {
  return (
    <>
      <label className="blog-label" htmlFor="gn">Group name</label>
      <input id="gn" name="name" maxLength={GROUP_NAME_MAX} defaultValue={group?.name || ''} placeholder="Pop Punk Forever" required className="blog-title-input" />
      <label className="blog-label" htmlFor="gc">Category</label>
      <select id="gc" name="category" defaultValue={group?.category || 'Music'}>
        {GROUP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <label className="blog-label" htmlFor="gd">What&apos;s it about?</label>
      <textarea id="gd" name="description" rows={5} maxLength={GROUP_DESC_MAX} defaultValue={group?.description || ''} placeholder="Who should join, what you post about, any rules…" />
      <span className="blog-label">Group picture</span>
      <UploadField name="avatarUrl" kind="image" accept="image/*" defaultValue={group?.avatarUrl || ''} />
    </>
  );
}
