import Link from 'next/link';
import { HALLOWEEN } from '@/lib/cosmetics';
import { getCurrentUser } from '@/lib/auth';
import { stripeConfigured } from '@/lib/stripe';
import { THEMES } from '@/lib/themes';
import { ABOUT_TEMPLATES } from '@/lib/aboutTemplates';
import { PRICES, FEATURE_DAYS, SONG_BOOST_DAYS, SPONSOR_HOURS, money } from '@/lib/pricing';
import { isSupporter, isFeatured, ownedThemeSlugs, ownedAboutSlugs } from '@/lib/perks';
import { applyTheme, applyAboutTemplate, cancelSupporter, resumeSupporter, saveSupporterPrefs, setNameEffect } from '@/app/actions/shop';
import { NAME_EFFECTS, ownsNameEffect } from '@/lib/nameEffects';
import { refreshSupporter, diagnoseSupporter } from '@/lib/fulfill';
import { prisma } from '@/lib/db';
import BuyButton from '@/components/BuyButton';
import Notice from '@/components/Notice';
import { fmtDay } from '@/lib/util';
import { inAndroidApp } from '@/lib/appMode';

export const metadata = { title: 'Shop | BFRENZ.com' };

function until(d) {
  return d && new Date(d) > new Date() ? fmtDay(d) : null;
}

export default async function ShopPage({ searchParams }) {
  const sp = await searchParams;
  let me = await getCurrentUser();
  const payments = stripeConfigured();

  // Re-check Supporter status with Stripe so it's right even if a webhook was missed.
  let sub = null;
  if (me && payments && (isSupporter(me) || me.stripeSubscription)) {
    sub = await refreshSupporter(me).catch(() => null);
    if (sub) me = await prisma.user.findUnique({ where: { id: me.id } });
  }
  const subActive = sub && ['active', 'trialing', 'past_due'].includes(sub.status);
  const ending = subActive && (sub.cancel_at_period_end || !!sub.cancel_at);

  const owned = me ? await ownedThemeSlugs(me.id) : new Set();
  const ownedAbout = me ? await ownedAboutSlugs(me.id) : new Set();
  const supporter = isSupporter(me);
  const isOwner = !!me && (process.env.FOUNDER_USERNAME || '').toLowerCase() === me.username;
  const debug = isOwner && payments && sp?.debug ? await diagnoseSupporter(me) : null;
  const merch = process.env.MERCH_URL || '';
  const androidApp = await inAndroidApp();

  const signIn = (label) => (
    <Link href="/login" className="btn small-btn">{label}</Link>
  );

  return (
    <div className="shop">
      <div className="shop-hero">
        <h1>BFRENZ Shop</h1>
        <p className="muted">
          BFRENZ is free, and it always will be. Everything here is an optional extra that helps keep the lights on.
        </p>
        {!payments && (
          <div className="notice error">Payments aren&apos;t switched on yet, so buttons won&apos;t work until they are.</div>
        )}
      </div>
      <Notice sp={sp} />
      {androidApp && (
        <div className="notice ok">
          Purchases aren&apos;t available in the Android app. Anything you already own (or earn from invites) works here.
        </div>
      )}
      {isOwner && payments && (
        <div className="small muted" style={{ margin: '-6px 0 12px' }}>
          Owner tools: <a href="/shop?debug=1#debug">check Supporter lookup</a>
        </div>
      )}
      {debug && (
        <pre id="debug" className="code" style={{ whiteSpace: 'pre-wrap', marginBottom: 18 }}>{debug}</pre>
      )}

      {/* ---------------- Supporter ---------------- */}
      <div className="box orange supporter-card" id="supporter">
        <div className="box-h orange">
          ★ BFRENZ Supporter
          <span className="right">{money(PRICES.supporterMonthly)}/month</span>
        </div>
        <div className="box-b">
          <ul className="perk-list">
            <li><b>Every premium theme</b> and <b>About Me template</b> included</li>
            <li>Gold <span className="badge badge-supporter">★</span> Supporter badge next to your name</li>
            <li><b>Top 16</b> instead of Top 8</li>
            <li>See <b>who&apos;s been creeping</b> on your profile</li>
            <li>Pick your own <b>name color</b> in comments</li>
            <li>Glowing animated border on your profile</li>
            <li>No ads, ever</li>
          </ul>
          {!me ? (
            signIn('Log in to become a Supporter')
          ) : supporter ? (
            <>
              {sp?.cancelled && <div className="notice ok">Cancelled. You keep your perks until {until(me.supporterUntil)}.</div>}
              {sp?.resumed && <div className="notice ok">Welcome back! Your Supporter membership will keep renewing.</div>}
              <div className="notice ok">
                You&apos;re a Supporter
                {until(me.supporterUntil)
                  ? (ending ? ` until ${until(me.supporterUntil)} (won't renew)` : ` · renews ${until(me.supporterUntil)}`)
                  : until(me.bonusSupporterUntil)
                    ? ` free until ${until(me.bonusSupporterUntil)} (invite reward)`
                    : ''}.
                Thank you! 🧡
              </div>
              <form action={saveSupporterPrefs} className="actions">
                <label className="small" htmlFor="nc">Your name color:</label>
                <input id="nc" type="color" name="nameColor" defaultValue={me.nameColor || '#ff9a45'} />
                <button className="btn small-btn" type="submit">Save color</button>
              </form>
              {subActive && (
                <form action={ending ? resumeSupporter : cancelSupporter} style={{ marginTop: 10 }}>
                  <button className="btn ghost small-btn" type="submit">
                    {ending ? 'Keep my Supporter membership' : 'Cancel membership'}
                  </button>
                  <div className="small muted" style={{ marginTop: 6 }}>
                    {ending
                      ? "You won't be charged again. Changed your mind? Click above."
                      : "Cancelling stops future charges; you keep your perks until the end of the month you paid for. To update your card, use the link in your Stripe receipt email."}
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="supporter-plans">
              <BuyButton kind="supporter" label={`Monthly · ${money(PRICES.supporterMonthly)}/mo`} />
              <BuyButton kind="supporter_yearly" label={`Yearly · ${money(PRICES.supporterYearly)}/yr (save ${Math.round((1 - PRICES.supporterYearly / (PRICES.supporterMonthly * 12)) * 100)}%)`} />
            </div>
          )}
          {me && !me.lifetimeSupporter && (
            <div className="lifetime-box">
              <div>
                <b>★∞ Lifetime Supporter</b> · {money(PRICES.supporterLifetime)} once
                <div className="small muted">
                  Every perk, forever, plus a special ★∞ badge for early believers. No monthly bill
                  {subActive ? ' (your monthly plan is cancelled automatically)' : ''}.
                </div>
              </div>
              <BuyButton kind="supporter_lifetime" back="/shop#supporter" label="Go Lifetime" ghost />
            </div>
          )}
          {me?.lifetimeSupporter && <div className="notice ok" style={{ marginTop: 10 }}>★∞ You&apos;re a Lifetime Supporter. Thank you!</div>}
          <div className="small" style={{ marginTop: 10 }}>
            🎁 Want to treat a fren? Hit <b>Gift Supporter</b> on their profile.
          </div>
        </div>
      </div>

      {/* ---------------- Name effects ---------------- */}
      <div className="box" id="name-effects">
        <div className="box-h">
          ✨ Name Effects
          {me?.nameEffect && (
            <form action={setNameEffect} className="right">
              <input type="hidden" name="slug" value="" />
              <button className="linkbtn small" type="submit">Remove effect</button>
            </form>
          )}
        </div>
        <div className="box-b small muted" style={{ paddingBottom: 0 }}>
          Your name sparkles everywhere it shows up: comments, Top 8, the Feed and your profile.{' '}
          {money(PRICES.nameEffect)} each, forever, or <b>all of them</b> with Supporter.
        </div>
        <div className="fx-grid">
          {NAME_EFFECTS.map((fx) => {
            const usable = me && ownsNameEffect(me, fx.slug);
            const on = me?.nameEffect === fx.slug && usable;
            return (
              <div key={fx.slug} className={`fx-card${on ? ' applied' : ''}`}>
                <span className={`fx-preview ${fx.cls}`}>{me?.displayName || 'Your Name'}</span>
                <span className="small muted">{fx.name}</span>
                {!me ? null : on ? (
                  <span className="small"><b>✓ On your name</b></span>
                ) : usable ? (
                  <form action={setNameEffect}>
                    <input type="hidden" name="slug" value={fx.slug} />
                    <button className="btn small-btn" type="submit">Use</button>
                  </form>
                ) : (
                  <BuyButton kind="name_effect" itemId={fx.slug} back="/shop#name-effects" label={`Get · ${money(PRICES.nameEffect)}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- Themes ---------------- */}
      <div className="box" id="themes">
        <div className="box-h">
          Profile Themes
          {me?.theme && (
            <form action={applyTheme} className="right">
              <input type="hidden" name="slug" value="" />
              <button className="linkbtn small" type="submit">Remove my theme</button>
            </form>
          )}
        </div>
        <div className="theme-grid">
          {THEMES.map((t) => {
            const usable = t.price === 0 || supporter || owned.has(t.slug);
            const applied = me?.theme === t.slug;
            return (
              <div key={t.slug} className={`theme-card${applied ? ' applied' : ''}`}>
                <img src={`/themes/${t.slug}.png`} alt={`${t.name} preview`} loading="lazy" />
                <div className="theme-info">
                  <div className="theme-top">
                    <b>{t.name}</b>
                    <span className="theme-price">
                      {t.price === 0 ? 'FREE' : usable ? (supporter && !owned.has(t.slug) ? 'Included' : 'Owned') : money(t.price)}
                    </span>
                  </div>
                  <p className="small muted">{t.description}</p>
                  <div className="actions">
                    {me && (
                      <Link href={`/${me.username}?preview=${t.slug}`} className="btn ghost small-btn">Preview</Link>
                    )}
                    {!me ? (
                      signIn('Log in')
                    ) : applied ? (
                      <span className="small"><b>✓ On your profile</b></span>
                    ) : usable ? (
                      <form action={applyTheme} className="inline">
                        <input type="hidden" name="slug" value={t.slug} />
                        <button className="btn small-btn" type="submit">Use theme</button>
                      </form>
                    ) : (
                      <BuyButton kind="theme" itemId={t.slug} back="/shop#themes" label={`Buy · ${money(t.price)}`} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="small muted" style={{ padding: '0 16px 16px' }}>
          Themes go under your own Customize (CSS), so you can still tweak colors and pictures on top.
        </div>
      </div>

      {/* ---------------- About Me templates ---------------- */}
      <div className="box" id="about">
        <div className="box-h">About Me Templates</div>
        <div className="small muted" style={{ padding: '12px 16px 0' }}>
          Ready-made About Me layouts. Pick one, fill in the [brackets] with your own stuff, done.
          Works with any theme.
        </div>
        <div className="theme-grid">
          {ABOUT_TEMPLATES.map((t) => {
            const usable = t.price === 0 || supporter || ownedAbout.has(t.slug);
            const applied = me?.aboutTemplate === t.slug;
            return (
              <div key={t.slug} className={`theme-card${applied ? ' applied' : ''}`}>
                <img src={`/about/${t.slug}.png`} alt={`${t.name} preview`} loading="lazy" className="about-thumb" />
                <div className="theme-info">
                  <div className="theme-top">
                    <b>{t.name}</b>
                    <span className="theme-price">
                      {t.price === 0 ? 'FREE' : usable ? (supporter && !ownedAbout.has(t.slug) ? 'Included' : 'Owned') : money(t.price)}
                    </span>
                  </div>
                  <p className="small muted">{t.description}</p>
                  <div className="actions">
                    {me && (
                      <Link href={`/${me.username}?about=${t.slug}`} className="btn ghost small-btn">Preview</Link>
                    )}
                    {!me ? (
                      signIn('Log in')
                    ) : usable ? (
                      <>
                        <form action={applyAboutTemplate} className="inline">
                          <input type="hidden" name="slug" value={t.slug} />
                          <input type="hidden" name="mode" value="fill" />
                          <button className="btn small-btn" type="submit">{applied ? 'Start over' : 'Use template'}</button>
                        </form>
                        {!applied && me.aboutMe && (
                          <form action={applyAboutTemplate} className="inline">
                            <input type="hidden" name="slug" value={t.slug} />
                            <input type="hidden" name="mode" value="style" />
                            <button className="linkbtn small" type="submit" title="Keep your words, just use this look">Look only</button>
                          </form>
                        )}
                      </>
                    ) : (
                      <BuyButton kind="about" itemId={t.slug} back="/shop#about" label={`Buy · ${money(t.price)}`} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="small muted" style={{ padding: '0 16px 16px' }}>
          &ldquo;Use template&rdquo; swaps in the template text (your old About Me is saved, and you can restore it from Edit Profile).
          &ldquo;Look only&rdquo; keeps your words and just adds the style.
        </div>
      </div>

      {Date.now() < Date.parse(HALLOWEEN.until) && (
        <Link href={me ? '/edit?tab=design#frame' : '/signup'} className="season-banner" style={{ display: 'block' }}>
          <b>🎃 Halloween pack is here, until Oct 31 only!</b> Pumpkin, witchy, ghostly and blood moon frames, 🦇 bat trails, and 👻 ghosts, 🎃 pumpkins and 🍬 candy falling on your page. Keep them forever &raquo;
        </Link>
      )}

      {/* ---------------- Boosts ---------------- */}
      <div className="box" id="boosts">
        <div className="box-h">Get Noticed</div>
        <div className="boost-grid">
          <div className="boost">
            <div className="boost-ico">⭐</div>
            <b>Featured Profile</b>
            <p className="small muted">Top spot in &ldquo;Cool New People&rdquo; on the homepage for {FEATURE_DAYS} days.</p>
            {until(me?.featuredUntil) && <p className="small">Featured until {until(me.featuredUntil)}</p>}
            {me ? <BuyButton kind="feature" back="/shop#boosts" label={`${isFeatured(me) ? 'Add' : 'Feature me'} · ${money(PRICES.feature)}`} /> : signIn('Log in')}
          </div>
          <div className="boost">
            <div className="boost-ico">🎵</div>
            <b>Promote My Song</b>
            <p className="small muted">Your profile song in &ldquo;Featured Music&rdquo; for {SONG_BOOST_DAYS} days, playable right from the homepage.</p>
            {until(me?.songBoostUntil) && <p className="small">Promoted until {until(me.songBoostUntil)}</p>}
            {!me ? signIn('Log in') : me.songUrl ? (
              <BuyButton kind="song_boost" back="/shop#boosts" label={`Promote · ${money(PRICES.songBoost)}`} />
            ) : (
              <Link href="/edit?tab=song" className="btn ghost small-btn">Add a song first</Link>
            )}
          </div>
          <div className="boost">
            <div className="boost-ico">🎤</div>
            <b>Pro Artist Badge</b>
            <p className="small muted">A <span className="badge badge-pro">♫ PRO</span> badge on your profile and comments, forever. For musicians, DJs and producers.</p>
            {!me ? signIn('Log in') : me.artistPro ? (
              <p className="small"><b>✓ You&apos;re a Pro Artist</b></p>
            ) : (
              <BuyButton kind="pro_artist" back="/shop#boosts" label={`Go Pro · ${money(PRICES.proArtist)}`} />
            )}
          </div>
          <div className="boost">
            <div className="boost-ico">📢</div>
            <b>Sponsored Bulletin</b>
            <p className="small muted">Send one of your bulletins to <b>every</b> member (not just friends) for {SPONSOR_HOURS} hours, labeled &ldquo;Sponsored&rdquo;.</p>
            <Link href="/bulletins" className="btn ghost small-btn">Pick a bulletin · {money(PRICES.sponsorBulletin)}</Link>
          </div>
          <div className="boost">
            <div className="boost-ico">🚀</div>
            <b>Boost a Post</b>
            <p className="small muted">Put any of your posts near the top of <b>everyone&apos;s</b> feed as &ldquo;Promoted&rdquo;. Hit 🚀 Boost on your post to start.</p>
            <Link href={me ? `/${me.username}` : '/login'} className="btn ghost small-btn">From {money(PRICES.postBoost[1])} / day</Link>
          </div>
          <div className="boost">
            <div className="boost-ico">🪙</div>
            <b>Coins &amp; Gifts</b>
            <p className="small muted">Send 🌹 🔥 👑 💎 gifts on posts, profiles and live streams.{me ? <> You have <b>🪙 {me.coins}</b>.</> : ''}</p>
            <Link href="/coins" className="btn ghost small-btn">Get coins · from {money(PRICES.coinPacks[0].cents)}</Link>
            <Link href="/coins#send-coins" className="small" style={{ marginTop: 6 }}>🎁 Send coins to a fren</Link>
          </div>
        </div>
      </div>

      {/* ---------------- Tips + merch ---------------- */}
      <div className="cols">
        <div className="col-right">
          <div className="box" id="tip">
            <div className="box-h">🧡 Tip Jar</div>
            <div className="box-b">
              <p className="small muted" style={{ marginTop: 0 }}>Love BFRENZ? Chip in to help pay for servers. Every bit helps.</p>
              <div className="actions">
                {me
                  ? PRICES.tips.map((a) => <BuyButton key={a} kind="tip" amount={a} back="/shop#tip" label={money(a)} ghost />)
                  : signIn('Log in to tip')}
              </div>
            </div>
          </div>
        </div>
        {merch && (
          <div className="col-left">
            <div className="box" id="merch">
              <div className="box-h">👕 Merch</div>
              <div className="box-b">
                <p className="small muted" style={{ marginTop: 0 }}>Shirts, hoodies and stickers with the BFRENZ logo.</p>
                <a href={merch} target="_blank" rel="noopener noreferrer" className="btn small-btn">Shop merch</a>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="small muted" style={{ textAlign: 'center' }}>
        Payments are handled securely by Stripe; BFRENZ never sees your card. By buying you agree to our{' '}
        <Link href="/terms">Terms</Link> (including refunds) and <Link href="/privacy">Privacy Policy</Link>. If
        you&apos;re under 18, ask a parent before buying anything.
      </p>
    </div>
  );
}
