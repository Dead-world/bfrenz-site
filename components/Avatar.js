import Link from 'next/link';

export function avatarSrc(user) {
  return user?.avatarUrl || '/no-pic.svg';
}

/** A friend tile: name on top, square picture below (the classic Top 8 cell). */
export function FriendTile({ user, size = 90 }) {
  return (
    <div className="friend-tile">
      <Link href={`/${user.username}`} className="friend-name">
        {user.displayName}
      </Link>
      <Link href={`/${user.username}`}>
        <img src={avatarSrc(user)} alt={user.displayName} width={size} height={size} className="pic" />
      </Link>
    </div>
  );
}

export function Pic({ user, size = 90 }) {
  return (
    <img src={avatarSrc(user)} alt={user?.displayName || ''} width={size} height={size} className="pic" />
  );
}
