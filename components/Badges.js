import { isSupporter } from '@/lib/perks';
import { activeNameEffect } from '@/lib/nameEffects';

/** Little badges shown next to a member's name. */
export default function Badges({ user }) {
  if (!user) return null;
  const supporter = isSupporter(user);
  if (!supporter && !user.isArtist && !user.isOfficial) return null;
  return (
    <span className="badges">
      {user.isOfficial && (
        <span className="badge badge-bot" title="Official BFRENZ account (automated, not a real person)">🤖 BOT</span>
      )}
      {supporter && (
        <span className={`badge badge-supporter${user.lifetimeSupporter ? ' badge-lifetime' : ''}`} title={user.lifetimeSupporter ? 'Lifetime BFRENZ Supporter' : 'BFRENZ Supporter'}>
          {user.lifetimeSupporter ? '★∞' : '★'}
        </span>
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
  const fx = activeNameEffect(user);
  if (fx) return <span className={`name-fx ${fx.cls}`}>{user.displayName}</span>;
  const color = isSupporter(user) && user.nameColor ? user.nameColor : undefined;
  return <span style={color ? { color } : undefined}>{user.displayName}</span>;
}
