import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import Notice from '@/components/Notice';
import UploadField from '@/components/UploadField';
import { Pic } from '@/components/Avatar';
import { updateInfo, updateInterests, updatePic, updateSong, updateCss } from '@/app/actions/profile';
import { removeAboutTemplate, restoreAboutBackup } from '@/app/actions/shop';
import { getAboutTemplate } from '@/lib/aboutTemplates';
import NotificationToggle from '@/components/NotificationToggle';
import PlaylistEditor from '@/components/PlaylistEditor';
import RichTextarea from '@/components/RichTextarea';
import { CREATOR_TYPES, MAX_LINKS, cleanLinks } from '@/lib/creators';
import { saveCreatorSettings } from '@/app/actions/creators';
import { cleanPlaylist } from '@/lib/playlist';
import { vapidPublicKey } from '@/lib/push';
import LayoutEditor from '@/components/LayoutEditor';

export const metadata = { title: 'Edit Profile | BFRENZ.com' };

const TABS = [
  ['info', 'Profile info'],
  ['interests', 'Interests'],
  ['pic', 'Profile pic'],
  ['song', 'Music / playlist'],
  ['layout', '🧩 Layout'],
  ['creator', '🎥 Creator'],
  ['css', 'Customize (CSS)'],
  ['notify', 'Notifications'],
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
          <Link href="/blocked" className="btn ghost small-btn">Blocked members</Link>
          <Link href="/account/delete" className="btn ghost small-btn">Delete account</Link>
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
                <tr>
                  <td className="lbl">Birthday</td>
                  <td>
                    <div className="actions">
                      <select name="birthMonth" defaultValue={me.birthMonth ?? ''} aria-label="Birthday month">
                        <option value="">Month</option>
                        {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                          <option key={m} value={i + 1}>{m}</option>
                        ))}
                      </select>
                      <select name="birthDay" defaultValue={me.birthDay ?? ''} aria-label="Birthday day">
                        <option value="">Day</option>
                        {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                      </select>
                    </div>
                    <div className="small muted">Your frenz get a heads-up on your birthday. The year is never shown.</div>
                  </td>
                </tr>
                <tr><td className="lbl">Location</td><td><input type="text" name="location" defaultValue={me.location} maxLength={80} placeholder="City, State" /></td></tr>
                <tr>
                  <td className="lbl">Artist</td>
                  <td>
                    <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="checkbox" name="isArtist" defaultChecked={me.isArtist} /> I make music (shows an Artist label on my profile)
                    </label>
                    <input type="text" name="genre" defaultValue={me.genre} maxLength={40} placeholder="Genre, e.g. hip hop, pop punk" style={{ marginTop: 6 }} />
                  </td>
                </tr>
                <tr>
                  <td className="lbl">About me</td>
                  <td>
                    <RichTextarea name="aboutMe" rows={10} maxLength={20000} defaultValue={me.aboutMe} />
                    <div className="small muted">HTML is allowed: &lt;b&gt;, &lt;font color&gt;, &lt;img&gt;, &lt;marquee&gt; and friends.</div>
                    {sp?.template && (
                      <div className="notice ok" style={{ marginTop: 8 }}>
                        Template added! Replace everything in [brackets] with your own stuff, then hit Save.
                      </div>
                    )}
                    <div className="small" style={{ marginTop: 6 }}>
                      {getAboutTemplate(me.aboutTemplate) ? (
                        <>Template: <b>{getAboutTemplate(me.aboutTemplate).name}</b> &middot; </>
                      ) : null}
                      <Link href="/shop#about">Get an About Me template</Link>
                    </div>
                  </td>
                </tr>
                <tr><td className="lbl">Who I&apos;d like to meet</td><td><RichTextarea name="meet" rows={5} maxLength={10000} defaultValue={me.meet} /></td></tr>
                <tr><td /><td><button className="btn" type="submit">Save changes</button></td></tr>
              </tbody>
            </table>
          </div>
        </form>
      )}
      {tab === 'info' && (me.aboutTemplate || me.aboutMeBackup) && (
        <div className="actions" style={{ marginTop: -6, marginBottom: 18 }}>
          {me.aboutTemplate && (
            <form action={removeAboutTemplate}>
              <button className="btn ghost small-btn" type="submit">Remove template look</button>
            </form>
          )}
          {me.aboutMeBackup && (
            <form action={restoreAboutBackup}>
              <button className="btn ghost small-btn" type="submit">Restore my old About Me</button>
            </form>
          )}
        </div>
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
          <div className="box-h">Profile music</div>
          <div className="box-b">
            <p className="small muted" style={{ marginTop: 0 }}>
              Upload an MP3/M4A (up to 15 MB), or paste a link from <b>YouTube, SoundCloud, Spotify, Apple Music,
              Audiomack, Deezer, Google Drive or Dropbox</b>. Uploaded files and direct audio links play in the BFRENZ
              player; the others play in their own player on your page (Spotify and Apple Music play a 30-second
              preview for people who aren&apos;t signed in to them). Only share music you have the rights to.
            </p>
            <div className="pl-section-title">Song 1 <span className="small muted">(main song: plays first, shows in Featured Music)</span></div>
            <UploadField name="songUrl" kind="song" accept="audio/*" defaultValue={me.songUrl} />
            <table className="form-table" style={{ marginTop: 10 }}>
              <tbody>
                <tr><td className="lbl">Song title</td><td><input type="text" name="songTitle" defaultValue={me.songTitle} maxLength={100} /></td></tr>
                <tr><td className="lbl">Artist</td><td><input type="text" name="songArtist" defaultValue={me.songArtist} maxLength={100} /></td></tr>
              </tbody>
            </table>
            <div className="pl-section-title" style={{ marginTop: 22 }}>
              Your playlist <span className="small muted">(up to 10 songs; they play one after another)</span>
            </div>
            <PlaylistEditor initial={cleanPlaylist(me.playlist)} />
            <div className="small muted" style={{ marginTop: 10 }}>To remove a song, clear its link (or hit ✕) and save.</div>
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
              Want a ready-made look? Grab one from the <Link href="/shop#themes">theme shop</Link>. Anything you
              paste here goes on top of it. Paste any CSS here and it&apos;s applied to your profile page. Change the background, colors, fonts, hide
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
      {tab === 'creator' && (
        <form action={saveCreatorSettings} className="box">
          <div className="box-h">Creator mode</div>
          <div className="box-b">
            <p className="small muted" style={{ marginTop: 0 }}>
              Make music, videos, streams, art or anything else? Turn on creator mode: fans can <b>follow</b> you with one tap
              (no friend request), you can post <b>publicly</b> to all your followers, add <b>My Links</b> buttons to your
              page, show up on <Link href="/creators">Discover Creators</Link> and see your <Link href="/creator/stats">stats</Link>.
              Your frenz work exactly the same.
            </p>
            <label className="blog-label" htmlFor="ct">I&apos;m a…</label>
            <select id="ct" name="creatorType" defaultValue={me.creatorType || ''}>
              <option value="">Not a creator (creator mode off)</option>
              {CREATOR_TYPES.map(([k, label, emoji]) => <option key={k} value={k}>{emoji} {label}</option>)}
            </select>

            <div className="blog-label" style={{ marginTop: 20 }}>My Links <span className="small muted">(link-in-bio buttons on your page, up to {MAX_LINKS})</span></div>
            <div className="small muted" style={{ marginBottom: 8 }}>
              Paste your YouTube, TikTok, Instagram, Twitch, Spotify, merch store… The icon is picked automatically. Then put
              <b> bfrenz.com/{me.username}</b> in your bio everywhere.
            </div>
            <table className="form-table link-rows">
              <tbody>
                {Array.from({ length: MAX_LINKS }, (_, i) => {
                  const l = cleanLinks(Array.isArray(me.creatorLinks) ? me.creatorLinks : [])[i] || {};
                  return (
                    <tr key={i}>
                      <td className="lbl">{i + 1}</td>
                      <td>
                        <div className="link-row">
                          <input type="url" name={`url${i}`} defaultValue={l.url || ''} placeholder="https://youtube.com/@you" />
                          <input type="text" name={`label${i}`} defaultValue={l.label || ''} maxLength={40} placeholder="Button text (optional)" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="actions" style={{ marginTop: 14 }}>
              <button className="btn" type="submit">Save</button>
              {me.creatorType && <Link href="/creator/stats" className="btn ghost small-btn">📊 My stats</Link>}
            </div>
          </div>
        </form>
      )}

      {tab === 'layout' && (
        <div className="box">
          <div className="box-h">Arrange your page</div>
          <div className="box-b">
            {sp?.saved === '1' && <div className="notice ok">Layout saved! <Link href={`/${me.username}`}>See your page</Link></div>}
            {sp?.saved === 'reset' && <div className="notice ok">Back to the default layout.</div>}
            <p className="small muted" style={{ marginTop: 0 }}>
              Drag boxes to put them in any order, or move them to the other column. On a phone, use the arrows.
              Tap 👁 to hide a box. On phones your page shows the left column first, then the right.
            </p>
            <LayoutEditor initial={me.profileLayout} username={me.username} />
          </div>
        </div>
      )}

      {tab === 'notify' && (
        <div className="box">
          <div className="box-h">Notifications</div>
          <div className="box-b">
            <NotificationToggle publicKey={vapidPublicKey()} />
            <p className="small muted" style={{ marginBottom: 0 }}>
              Notifications are set per device. Turn them on separately on your phone and your computer.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
