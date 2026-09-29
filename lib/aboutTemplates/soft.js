// About Me template: "Soft Aesthetic". Pastel, cozy, cute.
export const html = `<center><small>&#730; &#3864; &#9825; &#8902;&#65377;&#730;</small>
<h2>[your name]</h2>
<p><i>[pronouns] &middot; [age] &middot; [zodiac] &middot; [city]</i></p></center>
<hr>
<h3>&#9825; about</h3>
<p>[a soft little intro about you]</p>
<h3>&#9825; likes</h3>
<p>[matcha, rainy days, lip gloss, anime, etc]</p>
<h3>&#9825; dislikes</h3>
<p>[loud chewing, mornings, etc]</p>
<h3>&#9825; before you follow</h3>
<p>[anything people should know]</p>
<hr>
<center><small>thanks for visiting &#8902;&#65377;&#730; &#9729;</small></center>`;

export const css = `
.blurb.about-tpl-soft {
  max-width: 520px; margin: 6px auto; padding: 22px 26px; border-radius: 26px; color: #5a4a6e;
  background: linear-gradient(160deg, #fdf0ff, #eef4ff 50%, #fff4f0);
  box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.6), 0 16px 40px rgba(0, 0, 0, 0.35);
  font-family: Georgia, 'Times New Roman', serif;
}
.blurb.about-tpl-soft p, .blurb.about-tpl-soft i, .blurb.about-tpl-soft center { color: #5a4a6e; }
.blurb.about-tpl-soft small { color: #b08fd0; letter-spacing: 3px; }
.blurb.about-tpl-soft h2 { font-family: Georgia, serif; font-weight: normal; font-size: 34px; color: #a26bd6; margin: 4px 0; letter-spacing: 1px; border: 0; text-transform: lowercase; }
.blurb.about-tpl-soft h3 { font-family: Georgia, serif; font-weight: normal; font-style: italic; font-size: 16px; color: #d67aa6; margin: 14px 0 2px; letter-spacing: 0; text-transform: lowercase; border: 0; }
.blurb.about-tpl-soft p { margin: 0 0 4px; line-height: 1.6; }
.blurb.about-tpl-soft hr { border: 0; height: 1px; background: linear-gradient(90deg, transparent, #d9b8f0, transparent); margin: 14px 0; }
`;
