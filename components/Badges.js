import { isSupporter } from '@/lib/perks';

/** Little badges shown next to a member's name. */
export default function Badges({ user }) {
  if (!user) return null;
  const supporter = isSupporter(user);
  if (!supporter && !user.isArtist) return null;
  return (
    <span className="badges">
      {supporter && (
        <span className="badge badge-supporter" title="BFRENZ Supporter">★</span>
      )}
      {user.artistPro ? (
        <span className="badge badge-pro" title="Pro Artist">♫ PRO</span>
      ) : user.isArtist ? (
        <span className="badge badge-artist" title="Artist">♫</span>
      ) : null}
    </span>
  );
}

/** A display name in the member's Supporter color, if they picked one. */
export function Name({ user }) {
  const color = isSupporter(user) && user.nameColor ? user.nameColor : undefined;
  return <span style={color ? { color } : undefined}>{user.displayName}</span>;
}
