import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Notice from '@/components/Notice';
import VideoPlayer from '@/components/VideoPlayer';
import VideoUploader from '@/components/VideoUploader';
import { addVideo, deleteVideo, featureVideo, renameVideo } from '@/app/actions/videos';
import { isAdmin } from '@/lib/moderation';
import { videoMaxMb } from '@/lib/video';
import { fmtDay } from '@/lib/util';

export async function generateMetadata({ params }) {
  const { username } = await params;
  return { title: `${username}'s videos | BFRENZ.com` };
}

export default async function VideosPage({ params, searchParams }) {
  const { username } = await params;
  const sp = await searchParams;
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!user) notFound();
  const me = await getCurrentUser();
  if (user.bannedAt && !isAdmin(me)) notFound();
  const isMe = me?.id === user.id;
  const back = `/${user.username}/videos`;
  const videos = await prisma.video.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 200 });

  return (
    <div>
      <Notice sp={sp} />
      {sp?.posted && <div className="notice ok">Video posted!</div>}
      {sp?.removed && <div className="notice ok">Video deleted.</div>}

      {isMe && (
        <form action={addVideo} className="box orange">
          <div className="box-h orange">Post a video</div>
          <div className="box-b">
            <VideoUploader maxMb={videoMaxMb()} />
            <p className="small muted" style={{ marginBottom: 0 }}>
              Only post videos you made or have the rights to share. No nudity, violence or anything that breaks the{' '}
              <Link href="/terms">Terms</Link>.
            </p>
          </div>
        </form>
      )}

      <div className="box">
        <div className="box-h">
          {user.displayName}&apos;s Videos ({videos.length})
          <Link href={`/${user.username}`} className="right">&laquo; Back to profile</Link>
        </div>
        {videos.length === 0 ? (
          <div className="box-b muted">No videos yet.</div>
        ) : (
          <div className="video-grid">
            {videos.map((v) => (
              <div key={v.id} className="video-card" id={`v-${v.id}`}>
                <VideoPlayer video={v} />
                <div className="video-info">
                  <b>{v.title}</b>
                  {v.onProfile && <span className="owner-tag">on profile</span>}
                  <div className="small muted">{fmtDay(v.createdAt)}{v.youtubeId ? ' · YouTube' : ''}</div>
                  {v.description && <p className="small">{v.description}</p>}
                  <div className="actions">
                    {isMe && (
                      <form action={featureVideo}>
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="on" value={v.onProfile ? '0' : '1'} />
                        <button className="linkbtn small" type="submit">{v.onProfile ? 'Take off profile' : 'Show on profile'}</button>
                      </form>
                    )}
                    {isMe && (
                      <details className="inline-details">
                        <summary className="linkbtn small">Edit</summary>
                        <form action={renameVideo} className="stack" style={{ marginTop: 6 }}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="text" name="title" defaultValue={v.title} maxLength={100} required />
                          <textarea name="description" rows={2} maxLength={1000} defaultValue={v.description} />
                          <div><button className="btn small-btn" type="submit">Save</button></div>
                        </form>
                      </details>
                    )}
                    {isMe && (
                      <form action={deleteVideo}>
                        <input type="hidden" name="id" value={v.id} />
                        <button className="linkbtn small danger-link" type="submit">Delete</button>
                      </form>
                    )}
                    {me && !isMe && (
                      <Link className="small muted" href={`/report?kind=video&id=${v.id}&back=${encodeURIComponent(back)}`}>Report</Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
