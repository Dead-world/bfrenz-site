// About Me template: "Artist Press Kit". Bio, releases, shows and booking for musicians & DJs.
export const html = `<h1>[ARTIST NAME]</h1>
<p><b>[genre]</b> &middot; [city] &middot; [DJ / rapper / singer / producer]</p>
<marquee scrollamount="5">&#9733; NEW SINGLE "[TITLE]" OUT NOW &#9733; BOOKING OPEN &#9733; ADD ME TO YOUR TOP 8 &#9733;</marquee>
<h2>Bio</h2>
<p>[two or three lines: how you started, your sound, what you're working on next]</p>
<h2>Releases</h2>
<table width="100%">
<tr><td>[year]</td><td><b>[Title]</b></td><td>[single / EP / mixtape]</td></tr>
<tr><td>[year]</td><td><b>[Title]</b></td><td>[single / EP / mixtape]</td></tr>
<tr><td>[year]</td><td><b>[Title]</b></td><td>[single / EP / mixtape]</td></tr>
</table>
<h2>Upcoming shows</h2>
<table width="100%">
<tr><td>[MON DD]</td><td>[Venue]</td><td>[City]</td></tr>
<tr><td>[MON DD]</td><td>[Venue]</td><td>[City]</td></tr>
</table>
<h2>Listen</h2>
<p><a href="https://open.spotify.com/">Spotify</a> &middot; <a href="https://soundcloud.com/">SoundCloud</a> &middot; <a href="https://music.apple.com/">Apple Music</a> &middot; <a href="https://www.youtube.com/">YouTube</a></p>
<h2>Booking</h2>
<p>[your booking email]</p>`;

export const css = `
.blurb.about-tpl-press-kit h1 {
  font-family: Impact, 'Arial Black', sans-serif; font-size: 52px; line-height: 1; margin: 0 0 6px;
  letter-spacing: 1px; text-transform: uppercase; text-align: left; animation: none;
  color: #fff; text-shadow: 4px 4px 0 var(--orange);
}
.blurb.about-tpl-press-kit marquee {
  background: var(--orange); color: #000; font-weight: bold; letter-spacing: 2px; padding: 6px 0; margin: 10px 0 4px;
  border: 0; font-size: 13px;
}
.blurb.about-tpl-press-kit h2 {
  font-family: Impact, 'Arial Black', sans-serif; font-size: 20px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--orange-hot); margin: 20px 0 8px; border-bottom: 0; padding: 0;
}
.blurb.about-tpl-press-kit table { border-collapse: collapse; }
.blurb.about-tpl-press-kit td { padding: 9px 8px; border-top: 1px solid var(--line); font-size: 14px; }
.blurb.about-tpl-press-kit tr:last-child td { border-bottom: 1px solid var(--line); }
.blurb.about-tpl-press-kit td:first-child { width: 100px; white-space: nowrap; font-weight: bold; color: var(--orange-hot); text-transform: uppercase; }
.blurb.about-tpl-press-kit a {
  display: inline-block; padding: 5px 12px; margin: 2px 0; border: 1px solid var(--orange); border-radius: 999px;
  font-weight: bold; font-size: 13px; text-decoration: none;
}
`;
