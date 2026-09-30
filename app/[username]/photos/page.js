import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Notice from '@/components/Notice';
import PhotoUploader from '@/components/PhotoUploader';
import PhotoGrid from '@/components/PhotoGrid';
import { addPhoto } from '@/app/actions/social';
import { createAlbum } from '@/app/actions/albums';
import { isAdmin } from '@/lib/moderation';

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
  if (user.bannedAt && !isAdmin(me)) notFound();
  const isMe = me?.id === user.id;
  const back = `/${user.username}/photos`;

  const [albums, loose, total] = await Promise.all([
    prisma.album.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { photos: true } },
        photos: { orderBy: { createdAt: 'desc' }, take: 1, select: { url: true } },
      },
    }),
    prisma.photo.findMany({
      where: { userId: user.id, albumId: null },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    prisma.photo.count({ where: { userId: user.id } }),
  ]);
  // Visitors don't see empty albums.
  const shownAlbums = isMe ? albums : albums.filter((a) => a._count.photos > 0);

  return (
    <div>
      <Notice sp={sp} />
      {sp?.added && <div className="notice ok">{sp.added === '1' ? 'Photo added!' : `${sp.added} photos added!`}</div>}
      {sp?.moved && <div className="notice ok">Photo moved.</div>}
      {sp?.deleted && <div className="notice ok">Album deleted.</div>}

      {isMe && (
        <div className="cols">
          <div className="col-right">
            <form action={addPhoto} className="box orange">
              <div className="box-h orange">Upload photos</div>
              <div className="box-b stack">
                <input type="hidden" name="back" value={back} />
                <label className="small">
                  Put them in:{' '}
                  <select name="albumId" defaultValue="">
                    <option value="">Not in an album</option>
                    {albums.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </label>
                <input type="text" name="caption" placeholder="Caption (optional, goes on every photo)" maxLength={200} />
                <PhotoUploader />
              </div>
            </form>
          </div>
          <div className="col-left">
            <form action={createAlbum} className="box">
              <div className="box-h">New album</div>
              <div className="box-b stack">
                <input type="text" name="name" placeholder="Album name (e.g. Summer 2026)" maxLength={60} required />
                <input type="text" name="description" placeholder="Description (optional)" maxLength={300} />
                <div><button className="btn small-btn" type="submit">Create album</button></div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="box">
        <div className="box-h">
          {user.displayName}&apos;s Albums ({shownAlbums.length})
          <span className="right">
            <span className="muted small">{total} photos &middot; </span>
            <Link href={`/${user.username}`}>&laquo; Back to profile</Link>
          </span>
        </div>
        {shownAlbums.length === 0 ? (
          <div className="box-b muted">{isMe ? 'No albums yet. Create one to start sorting your photos.' : 'No albums yet.'}</div>
        ) : (
          <div className="album-grid">
            {shownAlbums.map((a) => {
              const cover = a.coverUrl || a.photos[0]?.url;
              return (
                <Link key={a.id} href={`/${user.username}/photos/${a.id}`} className="album-tile">
                  <div className="album-cover">
                    {cover ? <img src={cover} alt="" loading="lazy" /> : <span>Empty</span>}
                  </div>
                  <b>{a.name}</b>
                  <span className="small muted">{a._count.photos} {a._count.photos === 1 ? 'photo' : 'photos'}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {(loose.length > 0 || (isMe && total === 0)) && (
        <div className="box">
          <div className="box-h">{shownAlbums.length ? 'Not in an album' : 'Photos'} ({loose.length})</div>
          <PhotoGrid photos={loose} user={user} me={me} albums={albums} back={back} />
        </div>
      )}
    </div>
  );
}
