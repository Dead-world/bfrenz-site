// About Me template: "The Survey". The 2006 bulletin survey, but on your profile.
const Q = [
  ['Name', '[your name]'], ['Nicknames', '[what people call you]'], ['Birthday', '[month day]'],
  ['Zodiac', '[sign]'], ['Where you live', '[city]'], ['Siblings', '[how many]'],
  ['Favorite color', '[color]'], ['Favorite food', '[food]'], ['Favorite song right now', '[song]'],
  ['Coke or Pepsi', '[pick one]'], ['Morning or night', '[pick one]'], ['Cats or dogs', '[pick one]'],
  ['Last thing you ate', '[food]'], ['Last text you sent', '[keep it clean lol]'],
  ['Biggest fear', '[fear]'], ['Dream job', '[job]'], ['Do you sing in the shower', '[yes/no]'],
  ['Who will repost this', '[your bestie]'], ['Something nobody knows', '[a secret-ish fact]'],
  ['Top 8 or Top 16', '[pick one]'],
];
export const html = `<h1>the BFRENZ survey</h1>
<p><small>copy it, fill it out, don't lie ;)</small></p>
<table width="100%">
${Q.map(([q, a], i) => `<tr><td>${i + 1}.</td><td><b>${q}?</b></td><td>${a}</td></tr>`).join('\n')}
</table>
<p><small>tag, you're it. now YOU fill it out</small></p>`;

export const css = `
.blurb.about-tpl-survey h1 {
  font-family: 'Trebuchet MS', 'Comic Sans MS', sans-serif; font-size: 30px; margin: 0;
  color: var(--orange-hot); text-transform: lowercase; letter-spacing: 0; text-align: left;
}
.blurb.about-tpl-survey p { margin: 2px 0 12px; }
.blurb.about-tpl-survey table { border-collapse: separate; border-spacing: 0; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.blurb.about-tpl-survey td { padding: 7px 10px; font-size: 13px; }
.blurb.about-tpl-survey tr:nth-child(odd) td { background: var(--surface-2); }
.blurb.about-tpl-survey tr:nth-child(even) td { background: var(--surface-3); }
.blurb.about-tpl-survey td:first-child { width: 46px; white-space: nowrap; color: var(--orange); font-weight: bold; text-align: right; }
.blurb.about-tpl-survey td:nth-child(2) { width: 45%; }
`;
