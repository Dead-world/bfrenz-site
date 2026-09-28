import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import Notice from '@/components/Notice';
import UploadField from '@/components/UploadField';
import { Pic } from '@/components/Avatar';
import { updateInfo, updateInterests, updatePic, updateSong, updateCss } from '@/app/actions/profile';

export const metadata = { title: 'Edit Profile | BFRENZ.com' };

const TABS = [
  ['info', 'Profile info'],
  ['interests', 'Interests'],
  ['pic', 'Profile pic'],
  ['song', 'Profile song'],
  ['css', 'Customize (CSS)'],
];

const CSS_EXAMPLE = `/* make the page yours */
body {
  background: #000 url('https://example.com/stars.gif');
}
.profile-name { color: #ff00cc; }
.box { border-color: #ff00cc; }
.box-h::before { background: #ff00cc; }`;

export default async function EditPage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp?.tab) ? sp.tab : 'info';

  return (
    <div>
      {sp?.welcome && (
        <div className="notice ok">
          Welcome to BFRENZ, {me.displayName}! Fill in your profile so your frenz can find you.
        </div>
      )}
      <div className="actions" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <h1 className="bigname" style={{ margin: 0 }}>Edit your profile</h1>
        <div className="actions">
          <Link href="/edit/top8" className="btn ghost small-btn">Change Top 8</Link>
          <Link href={`/${me.username}`} className="btn small-btn">View my profile</Link>
        </div>
      </div>
      <div className="tabs">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/edit?tab=${k}`} className={k === tab ? 'on' : ''}>
            {label}
          </Link>
        ))}
      </div>
      <Notice sp={sp} />

      {tab === 'info' && (
        <form action={updateInfo} className="box">
          <div className="box-h">Profile info</div>
          <div className="box-b">
            <table className="form-table">
              <tbody>
                <tr><td className="lbl">Display name</td><td><input type="text" name="displayName" defaultValue={me.displayName} maxLength={40} /></td></tr>
                <tr><td className="lbl">Headline</td><td><input type="text" name="headline" defaultValue={me.headline} maxLength={140} style={{ width: '100%' }} placeholder="a quote, a vibe, a lyric you wrote…" /></td></tr>
                <tr><td className="lbl">Mood</td><td><input type="text" name="mood" defaultValue={me.mood} maxLength={60} placeholder="chillin 😎" /></td></tr>
                <tr><td className="lbl">Gender</td><td><input type="text" name="gender" defaultValue={me.gender} maxLength={30} /></td></tr>
                <tr><td className="lbl">Age</td><td><input type="number" name="age" defaultValue={me.age ?? ''} min={13} max={120} style={{ width: 90 }} /></td></tr>
                <tr><td className="lbl">Location</td><td><input type="text" name="location" defaultValue={me.location} maxLength={80} placeholder="City, State" /></td></tr>
                <tr>
                  <td className="lbl">About me</td>
                  <td>
                    <textarea name="aboutMe" rows={10} defaultValue={me.aboutMe} />
                    <div className="small muted">HTML is allowed: &lt;b&gt;, &lt;font color&gt;, &lt;img&gt;, &lt;marquee&gt; and friends.</div>
                  </td>
                </tr>
                <tr><td className="lbl">Who I&apos;d like to meet</td><td><textarea name="meet" rows={5} defaultValue={me.meet} /></td></tr>
                <tr><td /><td><button className="btn" type="submit">Save changes</button></td></tr>
              </tbody>
            </table>
          </div>
        </form>
      )}

      {tab === 'interests' && (
        <form action={updateInterests} className="box">
          <div className="box-h">Interests</div>
          <div className="box-b">
            <table className="form-table">
              <tbody>
                {[
                  ['General', 'interestsGeneral'],
                  ['Music', 'interestsMusic'],
                  ['Movies', 'interestsMovies'],
                  ['Television', 'interestsTv'],
                  ['Books', 'interestsBooks'],
                  ['Heroes', 'interestsHeroes'],
                ].map(([label, key]) => (
                  <tr key={key}>
                    <td className="lbl">{label}</td>
                    <td><textarea name={key} rows={3} defaultValue={me[key]} /></td>
                  </tr>
                ))}
                <tr><td /><td><button className="btn" type="submit">Save changes</button></td></tr>
              </tbody>
            </table>
          </div>
        </form>
      )}

      {tab === 'pic' && (
        <form action={updatePic} className="box">
          <div className="box-h">Profile pic</div>
          <div className="box-b">
            <div className="profile-head" style={{ marginBottom: 16 }}>
              <Pic user={me} size={150} />
              <div className="small muted">JPG, PNG, GIF or WebP up to 8 MB. Animated GIFs work!</div>
            </div>
            <UploadField name="avatarUrl" kind="image" accept="image/*" defaultValue={me.avatarUrl} />
            <div style={{ marginTop: 14 }}>
              <button className="btn" type="submit">Save</button>
            </div>
          </div>
        </form>
      )}

      {tab === 'song' && (
        <form action={updateSong} className="box">
          <div className="box-h">Profile song</div>
          <div className="box-b">
            <p className="small muted" style={{ marginTop: 0 }}>
              Upload an MP3/M4A (up to 15 MB) or paste a link to an audio file. It plays when people visit your page.
              Only upload music you have the rights to share.
            </p>
            <UploadField name="songUrl" kind="song" accept="audio/*" defaultValue={me.songUrl} />
            <table className="form-table" style={{ marginTop: 10 }}>
              <tbody>
                <tr><td className="lbl">Song title</td><td><input type="text" name="songTitle" defaultValue={me.songTitle} maxLength={100} /></td></tr>
                <tr><td className="lbl">Artist</td><td><input type="text" name="songArtist" defaultValue={me.songArtist} maxLength={100} /></td></tr>
              </tbody>
            </table>
            <div className="small muted">To remove your song, clear the link and save.</div>
            <div style={{ marginTop: 14 }}>
              <button className="btn" type="submit">Save</button>
            </div>
          </div>
        </form>
      )}

      {tab === 'css' && (
        <form action={updateCss} className="box">
          <div className="box-h">Customize your page</div>
          <div className="box-b">
            <p className="small muted" style={{ marginTop: 0 }}>
              Paste any CSS here and it&apos;s applied to your profile page. Change the background, colors, fonts, hide
              sections — go wild. See the <Link href="/help#css">list of class names</Link>.
            </p>
            <textarea name="customCss" rows={16} className="code" defaultValue={me.customCss} placeholder={CSS_EXAMPLE} />
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn" type="submit">Save CSS</button>
              <Link href={`/${me.username}`} className="small">Preview my page &raquo;</Link>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
