import { TIER_LABEL, inSeason } from '@/lib/stamps';

/** One stamp picture with its name and tier. */
export default function StampCard({ stamp, children, size = 96, count }) {
  return (
    <div className={`stamp-card tier-${stamp.tier}`}>
      <span className="stamp-img-wrap">
        <img src={`/stamps/${stamp.slug}.svg`} alt={stamp.name} width={size} height={Math.round(size * 1.25)} loading="lazy" />
        {count > 1 && <span className="stamp-count">×{count}</span>}
      </span>
      <b className="small">{stamp.name}</b>
      <span className={`stamp-tier small tier-${stamp.tier}`}>
        {TIER_LABEL[stamp.tier]}
        {stamp.tier === 'seasonal' && !inSeason(stamp) ? ' · away' : ''}
      </span>
      {children}
    </div>
  );
}
