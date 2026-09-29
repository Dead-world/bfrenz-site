// About Me template: "Trading Card". You, as a holographic collectible card.
const bar = (label, n, color) =>
  `<tr><td><b>${label}</b></td><td><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="${n}%" bgcolor="${color}">&nbsp;</td><td>&nbsp;</td></tr></table></td><td>${n}</td></tr>`;
export const html = `<div>
<p><small>BFRENZ CARD #001 &middot; ULTRA RARE</small></p>
<h1>[YOUR NAME]</h1>
<p><big>&#9733;&#9733;&#9733;&#9733;&#9733;</big></p>
<p><i>type: [main character / lover / menace]</i></p>
<table width="100%">
${bar('CHARM', 92, '#ff4fb8')}
${bar('LOYALTY', 100, '#ffd23f')}
${bar('HUMOR', 85, '#5fd4ff')}
${bar('CHAOS', 70, '#b98cff')}
${bar('SLEEP', 15, '#7ee081')}
</table>
<h3>SPECIAL MOVE</h3>
<p><b>[name of your move]</b> &mdash; [what it does, e.g. "makes any group chat funnier"]</p>
<h3>WEAKNESS</h3>
<p>[your weakness, e.g. "cannot say no to tacos"]</p>
<hr>
<p><small>&copy; [year] [your name] &middot; do not trade</small></p>
</div>`;

export const css = `
.blurb.about-tpl-trading-card > div {
  max-width: 440px; margin: 6px auto; padding: 18px 20px; text-align: center; color: #1b1030;
  border-radius: 18px; border: 6px solid #ffd23f;
  background: linear-gradient(135deg, #fff6d6, #ffe1f2 35%, #d9f3ff 65%, #efe0ff);
  background-size: 300% 300%;
  box-shadow: 0 0 0 2px #1b1030, 0 18px 40px rgba(0, 0, 0, 0.45);
  animation: tc-holo 6s ease-in-out infinite alternate;
}
@keyframes tc-holo { to { background-position: 100% 100%; } }
.blurb.about-tpl-trading-card p { margin: 0 0 6px; }
.blurb.about-tpl-trading-card small { letter-spacing: 2px; font-weight: bold; color: #6b5b00; }
.blurb.about-tpl-trading-card h1 {
  font-family: Impact, 'Arial Black', sans-serif; font-size: 38px; letter-spacing: 1px; margin: 4px 0;
  color: #1b1030; text-shadow: 2px 2px 0 #ffd23f; animation: none; text-transform: uppercase;
}
.blurb.about-tpl-trading-card big { color: #e0a800; font-size: 22px; letter-spacing: 3px; text-shadow: none; }
.blurb.about-tpl-trading-card > div > table { margin: 12px 0; text-align: left; }
.blurb.about-tpl-trading-card > div > table > tbody > tr > td { padding: 3px 4px; font-size: 12px; color: #1b1030; }
.blurb.about-tpl-trading-card > div > table > tbody > tr > td:first-child { width: 72px; }
.blurb.about-tpl-trading-card > div > table > tbody > tr > td:last-child { width: 40px; text-align: right; font-weight: bold; white-space: nowrap; }
.blurb.about-tpl-trading-card table table { background: rgba(27, 16, 48, 0.12); border-radius: 99px; overflow: hidden; height: 12px; box-shadow: none; }
.blurb.about-tpl-trading-card table table td { font-size: 1px; line-height: 12px; border-radius: 99px; }
.blurb.about-tpl-trading-card h3 { font-size: 12px; letter-spacing: 3px; margin: 12px 0 2px; color: #7a3cff; }
.blurb.about-tpl-trading-card hr { border: 0; border-top: 2px dashed rgba(27, 16, 48, 0.25); margin: 12px 0 8px; }
`;
