/** Retro hit counter: "You are visitor #000123". */
export default function HitCounter({ value, look = 'classic', label = true }) {
  const digits = String(Math.max(0, value || 0)).padStart(6, '0').split('');
  return (
    <div className={`hit-counter hc-${look}`}>
      {label && <div className="hc-label">Profile views</div>}
      <div className="hc-digits" aria-label={`${value} profile views`}>
        {digits.map((d, i) => (
          <span key={i} className="hc-d" aria-hidden="true">{d}</span>
        ))}
      </div>
    </div>
  );
}
