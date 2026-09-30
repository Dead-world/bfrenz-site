import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Notice from '@/components/Notice';
import PhotoUploader from '@/components/PhotoUploader';
import PhotoGrid from '@/components/PhotoGrid';
import { addPhoto } from '@/app/actions/social';
import { deleteAlbum, updateAlbum } from '@/app/actions/albums';
import { isAdmin } from '@/lib/moderation';

async function load(username, albumId) {
  const user = await prisma.user.findUnique({ where: { username: String(username).toLowerCase() } });
  if (!user) return {};
  const album = await prisma.album.findFirst({ where: { id: String(albumId), userId: user.id } });
  return { user, album };
}

export async function generateMetadata({ params }) {
  const { username, albumId } = await params;
  const { user, album } = await load(username, albumId);
  if (!user || !album || user.bannedAt) return { title: 'Not found | BFRENZ.com' };
  return { title: `${album.name} · ${user.displayName}'s photos | BFRENZ.com` };
}

export default async function AlbumPage({ params, searchParams }) {
  const { username, albumId } = await params;
  const sp = await searchParams;
  const { user, album } = await load(username, albumId);
  if (!user || !album) notFound();
  const me = await getCurrentUser();
  if (user.bannedAt && !isAdmin(me)) notFound();
  const isMe = me?.id === user.id;
  const back = `/${user.username}/photos/${album.id}`;

  const [photos, albums] = await Promise.all([
    prisma.photo.findMany({ where: { albumId: album.id }, orderBy: { createdAt: 'desc' }, take: 500 }),
    isMe ? prisma.album.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }) : [],
  ]);

  return (
    <div>
      <Notice sp={sp} />
      {sp?.created && <div className="notice ok">Album created! Now add some photos.</div>}
      {sp?.added && <div className="notice ok">{sp.added === '1' ? 'Photo added!' : `${sp.added} photos added!`}</div>}
      {sp?.moved && <div className="notice ok">Photo moved.</div>}
      {sp?.cover && <div className="notice ok">Album cover updated.</div>}

      <div className="album-head">
        <div>
          <div className="small muted">
            <Link href={`/${user.username}`}>{user.displayName}</Link> &raquo;{' '}
            <Link href={`/${user.username}/photos`}>Photos</Link> &raquo;
          </div>
          <h1 className="bigname" style={{ margin: '4px 0' }}>{album.name}</h1>
          {album.description && <div className="muted">{album.description}</div>}
          <div className="small muted">{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</div>
        </div>
        {isMe && (
          <div className="stack album-admin">
            <details>
              <summary className="btn ghost small-btn">Rename</summary>
              <form action={updateAlbum} className="stack" style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={album.id} />
                <input type="text" name="name" defaultValue={album.name} maxLength={60} required />
                <input type="text" name="description" defaultValue={album.description} maxLength={300} placeholder="Description" />
                <div><button className="btn small-btn" type="submit">Save</button></div>
              </form>
            </details>
            <details>
              <summary className="btn ghost small-btn">Delete album</summary>
              <form action={deleteAlbum} className="stack" style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={album.id} />
                <label className="small">
                  <input type="checkbox" name="keepPhotos" defaultChecked /> Keep the photos (move them to &ldquo;Not in an album&rdquo;)
                </label>
                <div><button className="btn small-btn danger" type="submit">Delete album</button></div>
              </form>
            </details>
          </div>
        )}
      </div>

      {isMe && (
        <form action={addPhoto} className="box orange">
          <div className="box-h orange">Add photos to {album.name}</div>
          <div className="box-b stack">
            <input type="hidden" name="albumId" value={album.id} />
            <input type="hidden" name="back" value={back} />
            <input type="text" name="caption" placeholder="Caption (optional)" maxLength={200} />
            <PhotoUploader />
          </div>
        </form>
      )}

      <div className="box">
        <div className="box-h">{album.name}</div>
        <PhotoGrid photos={photos} user={user} me={me} albums={albums} back={back} album={album} />
      </div>
    </div>
  );
}
