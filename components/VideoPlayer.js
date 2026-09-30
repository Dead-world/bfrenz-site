/** Plays an uploaded video file or a YouTube video. Nothing autoplays. */
export default function VideoPlayer({ video }) {
  if (video.youtubeId) {
    return (
      <div className="video-frame">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
          title={video.title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <div className="video-frame">
      <video src={video.url} controls preload="metadata" playsInline />
    </div>
  );
}
