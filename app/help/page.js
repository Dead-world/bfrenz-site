import Link from 'next/link';

export const metadata = { title: 'Help | BFRENZ.com' };

const CLASSES = [
  ['body', 'The whole page — set background images and colors here'],
  ['.profile-page', 'Wrapper around everything on a profile'],
  ['.profile-left / .profile-right', 'The two columns'],
  ['.profile-name', 'Your name at the top'],
  ['.profile-card', 'Name, pic, headline and mood box'],
  ['.box', 'Every card on the page'],
  ['.box-h', 'Card title bars (.box-h::before is the orange accent)'],
  ['.song-player', 'Your profile song player'],
  ['.contact-box', 'The "Contacting" box'],
  ['.interests-box / .interests', 'Your interests table'],
  ['.extended-network', 'The big banner above your blurbs'],
  ['.blurbs / .blurb-title / .blurb', 'About me and Who I\'d like to meet'],
  ['.top8-box / .top8 / .friend-tile', 'Your Top 8'],
  ['.comments-box / .comments', 'Your comment wall'],
];

export default function HelpPage() {
  return (
    <div className="cols">
      <div className="col-right">
        <div className="box">
          <div className="box-h">How BFRENZ works</div>
          <div className="box-b">
            <div className="blurb-title">Frenz &amp; your Top 8</div>
            <p>Hit &ldquo;Add to friends&rdquo; on anyone&apos;s profile. Once they approve, you can comment on each other&apos;s pages and see each other&apos;s bulletins. Choose who shows up in your Top 8 from <Link href="/edit/top8">Change Top 8</Link>.</p>
            <div className="blurb-title">Bulletins</div>
            <p>A bulletin goes out to every one of your frenz at once. Great for surveys, announcements and &ldquo;repost if…&rdquo; chains.</p>
            <div className="blurb-title">HTML in your profile</div>
            <p>Your About Me, comments and bulletins can use basic HTML like &lt;b&gt;, &lt;i&gt;, &lt;font color=&quot;orange&quot;&gt;, &lt;img src=&quot;…&quot;&gt;, &lt;center&gt; and yes, &lt;marquee&gt;. Scripts are removed.</p>
          </div>
        </div>
        <div className="box" id="css">
          <div className="box-h">Customizing your page with CSS</div>
          <div className="box-b">
            <p style={{ marginTop: 0 }}>Go to <Link href="/edit?tab=css">Edit Profile → Customize</Link> and paste CSS. These are the parts you can target:</p>
            <table className="list">
              <tbody>
                {CLASSES.map(([sel, what]) => (
                  <tr key={sel}>
                    <td className="code" style={{ color: 'var(--orange-hot)', whiteSpace: 'nowrap' }}>{sel}</td>
                    <td>{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Example:</p>
            <pre className="code">{`body { background: #120018 url('https://example.com/sparkles.gif'); }
.profile-name { color: #ff4fd8; text-shadow: 0 0 12px #ff4fd8; }
.box { border-color: #ff4fd8; }
.box-h::before { background: #ff4fd8; }
.extended-network { background: #ff4fd8; }`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
