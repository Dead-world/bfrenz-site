import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import UploadField from '@/components/UploadField';
import Notice from '@/components/Notice';
import { addPhoto, deletePhoto, makeProfilePic } from '@/app/actions/social';

export async function generateMetadata({ params }) {
  const { username } = await params;
  return { title: `${username}'s photos | BFRENZ.com` };
}

export default async function PhotosPage({ params, searchParams }) {
  const { username } = await params;
  const sp = await searchParams;
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!user) notFound();
  const me = await getCurrentUser();
  const isMe = me?.id === user.id;
  const photos = await prisma.photo.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  return (
    <div>
      <Notice sp={sp} />
      {isMe && (
        <form action={addPhoto} className="box orange">
          <div className="box-h orange">Upload a photo</div>
          <div className="box-b stack">
            <UploadField name="url" kind="image" accept="image/*" />
            <input type="text" name="caption" placeholder="Caption (optional)" maxLength={200} />
            <div><button className="btn" type="submit">Add to my photos</button></div>
          </div>
        </form>
      )}
      <div className="box">
        <div className="box-h">
          {user.displayName}&apos;s Photos ({photos.length})
          <Link href={`/${user.username}`} className="right">&laquo; Back to profile</Link>
        </div>
        {photos.length === 0 ? (
          <div className="box-b muted">No photos yet.</div>
        ) : (
          <div className="photo-grid">
            {photos.map((p) => (
              <figure key={p.id}>
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  <img src={p.url} alt={p.caption || `${user.displayName}'s photo`} loading="lazy" />
                </a>
                {p.caption && <figcaption>{p.caption}</figcaption>}
                {isMe && (
                  <div className="actions" style={{ justifyContent: 'center', marginTop: 4 }}>
                    <form action={makeProfilePic}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="linkbtn small">Make profile pic</button>
                    </form>
                    <form action={deletePhoto}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="linkbtn small muted">Delete</button>
                    </form>
                  </div>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
