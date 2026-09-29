// About Me template: "Top Secret Dossier". A classified file on you.
export const html = `<div>
<p><small>CLASSIFIED &middot; EYES ONLY &middot; FILE NO. [000-000]</small></p>
<h1>SUBJECT: [YOUR NAME]</h1>
<table width="100%">
<tr><td>ALIAS</td><td>[nickname]</td></tr>
<tr><td>LAST SEEN</td><td>[your city]</td></tr>
<tr><td>OCCUPATION</td><td>[what you do]</td></tr>
<tr><td>KNOWN ASSOCIATES</td><td>see Top 8</td></tr>
<tr><td>THREAT LEVEL</td><td><b>[LOW / MEDIUM / EXTREME]</b></td></tr>
</table>
<h2>BACKGROUND</h2>
<p>[two or three lines about your story]. Further details <s>have been redacted</s>.</p>
<h2>KNOWN HABITS</h2>
<ul>
<li>[habit one]</li>
<li>[habit two]</li>
<li>[habit three]</li>
</ul>
<h2>INTERCEPTED QUOTE</h2>
<blockquote>"[something you always say]"</blockquote>
<p><b>STATUS: [ACTIVE]</b> &middot; <small>hover the black bars to reveal</small></p>
</div>`;

export const css = `
.blurb.about-tpl-dossier > div {
  position: relative; padding: 26px 26px 20px; color: #2a2116;
  font-family: 'Courier New', ui-monospace, monospace;
  background: linear-gradient(180deg, #e8d6a8, #dcc48d);
  border-radius: 4px 18px 4px 4px;
  box-shadow: inset 0 0 60px rgba(120, 80, 20, 0.25), 0 14px 34px rgba(0, 0, 0, 0.45);
}
.blurb.about-tpl-dossier > div::before {
  content: 'TOP SECRET'; position: absolute; top: 22px; right: 18px; transform: rotate(8deg);
  border: 3px solid #b3001b; color: #b3001b; padding: 2px 10px; font-weight: bold; letter-spacing: 3px;
  font-size: 16px; opacity: 0.85;
}
.blurb.about-tpl-dossier p, .blurb.about-tpl-dossier li, .blurb.about-tpl-dossier td { color: #2a2116; font-family: 'Courier New', monospace; }
.blurb.about-tpl-dossier small { letter-spacing: 2px; color: #7a5a20; }
.blurb.about-tpl-dossier h1 {
  font-family: 'Courier New', monospace; font-size: 26px; font-weight: bold; color: #1a140c; text-align: left;
  letter-spacing: 1px; margin: 6px 0 14px; text-shadow: none; animation: none; text-transform: uppercase;
}
.blurb.about-tpl-dossier h2 {
  font-family: 'Courier New', monospace; font-size: 13px; letter-spacing: 3px; color: #1a140c;
  border-bottom: 2px solid #1a140c; padding-bottom: 3px; margin: 18px 0 8px;
}
.blurb.about-tpl-dossier table { border-collapse: collapse; }
.blurb.about-tpl-dossier td { padding: 5px 6px; border-bottom: 1px dashed rgba(42, 33, 22, 0.35); font-size: 13px; }
.blurb.about-tpl-dossier td:first-child { width: 170px; font-weight: bold; }
.blurb.about-tpl-dossier s { background: #111; color: #111; text-decoration: none; padding: 0 4px; transition: color 0.2s; }
.blurb.about-tpl-dossier s:hover { color: #f0e2c0; }
.blurb.about-tpl-dossier blockquote { margin: 8px 0; padding: 8px 12px; border-left: 4px solid #b3001b; background: rgba(0, 0, 0, 0.06); font-style: normal; color: #2a2116; }
.blurb.about-tpl-dossier ul { padding-left: 22px; }
`;
