// About Me template: "Receipt". Your personality, itemized.
const row = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
export const html = `<center><b>[YOUR NAME] MART</b><br><small>open 24/7 &middot; [your city]</small><br><small>cashier: [nickname] &middot; reg #08</small></center>
<hr>
<table width="100%">
${row('1x good vibes', '$0.00')}
${row('1x loyalty (lifetime)', 'PRICELESS')}
${row('2x bad jokes', '$0.50')}
${row('1x [your talent]', '$99.99')}
${row('1x [favorite snack]', '$3.49')}
${row('1x [your hobby]', '$20.00')}
${row('1x overthinking', 'FREE')}
</table>
<hr>
<table width="100%">
${row('SUBTOTAL', '1 real one')}
${row('TAX (drama)', '0%')}
${row('<b>TOTAL</b>', '<b>BEST FREN</b>')}
</table>
<hr>
<center><small>THANK YOU FOR VISITING<br>NO REFUNDS ON FRIENDSHIP<br>add me to your top 8 for a free gift</small><br><big>|| ||| | |||| || ||| |</big></center>`;

export const css = `
.blurb.about-tpl-receipt {
  max-width: 380px; margin: 8px auto 20px; padding: 22px 22px 34px; color: #222;
  font-family: 'Courier New', ui-monospace, monospace; font-size: 13px; background: #fbfbf6;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
  -webkit-mask: linear-gradient(#000, #000) top / 100% calc(100% - 10px) no-repeat,
    conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 16px 10px repeat-x;
  mask: linear-gradient(#000, #000) top / 100% calc(100% - 10px) no-repeat,
    conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 16px 10px repeat-x;
}
.blurb.about-tpl-receipt b, .blurb.about-tpl-receipt small, .blurb.about-tpl-receipt td, .blurb.about-tpl-receipt center { color: #222; font-family: inherit; }
.blurb.about-tpl-receipt b { font-size: 16px; letter-spacing: 2px; }
.blurb.about-tpl-receipt td b { font-size: 13px; letter-spacing: 0; }
.blurb.about-tpl-receipt hr { border: 0; border-top: 2px dashed #999; margin: 12px 0; }
.blurb.about-tpl-receipt td { padding: 2px 0; text-transform: uppercase; }
.blurb.about-tpl-receipt td:last-child { text-align: right; white-space: nowrap; }
.blurb.about-tpl-receipt big {
  display: block; width: 80%; height: 46px; margin: 14px auto 0; font-size: 0; color: transparent; text-shadow: none;
  background: repeating-linear-gradient(90deg, #111 0 2px, transparent 2px 4px, #111 4px 5px, transparent 5px 8px, #111 8px 11px, transparent 11px 13px, #111 13px 14px, transparent 14px 17px);
}
`;
