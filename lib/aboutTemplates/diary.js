// About Me template: "Dear Diary". Handwritten notebook page.
export const html = `<h3>dear diary,</h3>
<p><small>[today's date] &middot; [time] &middot; [where you are]</small></p>
<p>so my name is <b>[your name]</b> and honestly [a line about your life right now].</p>
<p>things i'm obsessed with lately: [thing], [thing] and [thing].</p>
<p>things that make me mad: [pet peeve]. don't even get me started.</p>
<p>if you're reading this, [a message to whoever visits your page].</p>
<p>ok gotta go, [reason you have to go lol].</p>
<p><i>xoxo, [your name]</i></p>
<p><small>p.s. [one more thing]</small></p>`;

export const css = `
.blurb.about-tpl-diary {
  position: relative; padding: 18px 20px 18px 64px; border-radius: 6px; color: #243056;
  font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive;
  background:
    linear-gradient(90deg, transparent 50px, #ef8fa0 50px, #ef8fa0 52px, transparent 52px),
    repeating-linear-gradient(180deg, #fffdf6 0 27px, #b9d3f0 27px 28px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  line-height: 28px;
}
.blurb.about-tpl-diary::before {
  content: ''; position: absolute; left: 18px; top: 20px; bottom: 20px; width: 14px;
  background: radial-gradient(circle, #d9d4c5 5px, transparent 6px) 0 0 / 14px 56px repeat-y;
}
.blurb.about-tpl-diary p, .blurb.about-tpl-diary b, .blurb.about-tpl-diary i { color: #243056; margin: 0; }
.blurb.about-tpl-diary small { color: #6a7aa6; }
.blurb.about-tpl-diary h3 { font-family: inherit; font-size: 26px; color: #c2185b; margin: 0; line-height: 56px; letter-spacing: 0; text-transform: none; }
`;
