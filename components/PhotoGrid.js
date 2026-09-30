import Link from 'next/link';
import { deletePhoto, makeProfilePic } from '@/app/actions/social';
import { movePhoto, setAlbumCover } from '@/app/actions/albums';

/** Photos with the owner's tools (profile pic, cover, move, delete) or a Report link for visitors. */
export default function PhotoGrid({ photos, user, me, albums = [], back, album = null }) {
  const isMe = me?.id === user.id;
  if (!photos.length) return <div className="box-b muted">No photos here yet.</div>;
  return (
    <div className="photo-grid">
      {photos.map((p) => (
        <figure key={p.id} id={`p-${p.id}`}>
          <a href={p.url} target="_blank" rel="noopener noreferrer">
            <img src={p.url} alt={p.caption || `${user.displayName}'s photo`} loading="lazy" />
          </a>
          {p.caption && <figcaption>{p.caption}</figcaption>}
          {album && album.coverUrl === p.url && <div className="small cover-tag">★ Album cover</div>}
          {me && !isMe && (
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <Link className="small muted" href={`/report?kind=photo&id=${p.id}&back=${encodeURIComponent(back)}`}>
                Report
              </Link>
            </div>
          )}
          {isMe && (
            <details className="photo-tools">
              <summary className="linkbtn small">Edit ▾</summary>
              <div className="stack">
                <form action={makeProfilePic}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className="linkbtn small">Make profile pic</button>
                </form>
                {album && album.coverUrl !== p.url && (
                  <form action={setAlbumCover}>
                    <input type="hidden" name="photoId" value={p.id} />
                    <button type="submit" className="linkbtn small">Make album cover</button>
                  </form>
                )}
                <form action={movePhoto} className="move-form">
                  <input type="hidden" name="photoId" value={p.id} />
                  <input type="hidden" name="back" value={back} />
                  <select name="albumId" defaultValue={p.albumId || ''} aria-label="Move to album">
                    <option value="">Not in an album</option>
                    {albums.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <button type="submit" className="linkbtn small">Move</button>
                </form>
                <form action={deletePhoto}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className="linkbtn small danger-link">Delete photo</button>
                </form>
              </div>
            </details>
          )}
        </figure>
      ))}
    </div>
  );
}
