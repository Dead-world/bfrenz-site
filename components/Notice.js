/** Error / success banners driven by ?error= and ?saved= query params. */
export default function Notice({ sp }) {
  if (!sp) return null;
  return (
    <>
      {sp.error && <div className="notice error">{String(sp.error)}</div>}
      {sp.saved && <div className="notice ok">Saved!</div>}
      {sp.sent && <div className="notice ok">Sent!</div>}
      {sp.voted && <div className="notice ok">Vote counted! 🏆 <a href="/potw">See this week&apos;s votes</a></div>}
      {sp.reported && <div className="notice ok">Thanks. Your report was sent to the BFRENZ team.</div>}
    </>
  );
}
