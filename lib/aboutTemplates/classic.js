// About Me template: "The Classic" (free). The old-school sections everyone had.
export const html = `<h2>About me:</h2>
<p>hey! i'm <b>[your name]</b> :) [a line or two about who you are]</p>
<p>[what you're into, what you do all day, where you're from]</p>
<h2>Who I'd like to meet:</h2>
<p>[the kind of people you want in your Top 8]</p>
<h2>Currently:</h2>
<table width="100%">
<tr><td><b>listening to</b></td><td>[song] - [artist]</td></tr>
<tr><td><b>watching</b></td><td>[show or movie]</td></tr>
<tr><td><b>reading</b></td><td>[book, or "lol nothing"]</td></tr>
<tr><td><b>eating</b></td><td>[snack]</td></tr>
<tr><td><b>mood</b></td><td>[mood]</td></tr>
</table>
<h2>Favorite quote:</h2>
<blockquote>"[a quote you live by]"</blockquote>
<p><small>thanks for the add! leave me a comment ♥</small></p>`;

export const css = `
.blurb.about-tpl-classic h2 {
  font-family: Verdana, Arial, sans-serif; font-size: 13px; font-weight: bold;
  color: var(--orange-hot); margin: 18px 0 6px; padding-bottom: 4px;
  border-bottom: 1px dotted var(--line); text-transform: none; letter-spacing: 0;
}
.blurb.about-tpl-classic h2:first-child { margin-top: 0; }
.blurb.about-tpl-classic p { margin: 0 0 8px; line-height: 1.6; }
.blurb.about-tpl-classic table { border-collapse: collapse; }
.blurb.about-tpl-classic td { padding: 5px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
.blurb.about-tpl-classic td:first-child { width: 120px; color: var(--text-dim); white-space: nowrap; }
.blurb.about-tpl-classic blockquote { margin: 8px 0; padding: 10px 14px; border-left: 3px solid var(--orange); background: var(--orange-soft); font-style: italic; }
`;
