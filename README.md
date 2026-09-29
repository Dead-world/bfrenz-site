# BFRENZ.com

A social network in the spirit of the mid-2000s classics, with an orange-and-black modern look:
profiles you can restyle with your own CSS, a Top 8, friend requests, comment walls, bulletins,
private mail, photo albums and a profile song.

Built with Next.js 15, Postgres (via Prisma) and Vercel Blob for uploads. It runs on Vercel's
free tier to start.

---

## Put it online (about 20 minutes)

You'll need free accounts on **GitHub** and **Vercel** (sign up at vercel.com with your GitHub account).

### 1. Put the code on GitHub
1. Go to github.com → **New repository** → name it `bfrenz` → **Create**.
2. On the new repo page click **uploading an existing file**, drag in everything from this folder
   (the `app`, `components`, `lib`, `prisma`, `public` folders and the files next to them), and **Commit**.

### 2. Import it into Vercel
1. At vercel.com → **Add New… → Project** → pick the `bfrenz` repo → **Import**.
2. Before clicking Deploy, open **Environment Variables** and add:
   - `SESSION_SECRET` — a long random string (40+ characters of gibberish is fine; keep it secret).
   - `FOUNDER_USERNAME` — the username you'll sign up with (e.g. `tom`). Optional, but it makes you
     everyone's first friend.
3. Click **Deploy**. The first deploy will fail because there's no database yet — that's expected.

### 3. Add the database and file storage
In your Vercel project:
1. **Storage** tab → **Create Database** → choose **Neon (Postgres)** → accept the defaults →
   connect it to the project. This adds `DATABASE_URL` for you.
2. **Storage** tab → **Create** → **Blob** → connect it to the project. This adds
   `BLOB_READ_WRITE_TOKEN` for you.
3. **Deployments** tab → the latest deployment → **⋯ → Redeploy**.

The build creates all the database tables automatically. When it finishes, open the `.vercel.app`
link, sign up with your `FOUNDER_USERNAME`, and you're live.

### 4. Point BFRENZ.com at it
1. Vercel project → **Settings → Domains** → add `bfrenz.com` and `www.bfrenz.com`.
2. Vercel shows the DNS records to add (usually an **A** record for `bfrenz.com` and a **CNAME**
   for `www`). Add them wherever you bought the domain (GoDaddy, Namecheap, etc.).
3. DNS can take a few minutes to a few hours. Vercel adds HTTPS automatically.

---

## Turn on "Forgot password?" emails

1. Sign up free at resend.com.
2. **Domains -> Add Domain** -> `bfrenz.com`. Resend shows a few DNS records; add them where your
   domain's DNS is managed (Vercel -> Domains, or your registrar). Wait until Resend says **Verified**.
3. **API Keys -> Create API Key** (Sending access). Copy it (starts with `re_`).
4. In Vercel -> Environment Variables add:
   - `RESEND_API_KEY` = the `re_...` key
   - `EMAIL_FROM` = `BFRENZ <no-reply@bfrenz.com>`
   - `SITE_URL` = `https://www.bfrenz.com`
5. Redeploy.

Reset links work once and expire after an hour. Resetting a password logs that account out everywhere else.

## Making money (all optional; the site stays free)

Everything is in the **Shop** (`/shop`). Prices live in `lib/pricing.js`; themes in `lib/themes/`.

| Extra | Price | What the buyer gets |
|---|---|---|
| Supporter | $2.99/mo | All themes, gold badge, Top 16, name color, glowing profile border, no ads |
| Themes | $1.99–$2.99 | One-time; Midnight Red is free for everyone |
| Pro Artist badge | $9.99 once | ♫ PRO badge on profile and comments |
| Featured Profile | $2.99 / 7 days | Top of Cool New People, labeled Featured |
| Promote My Song | $4.99 / 7 days | Song in Featured Music on the homepage |
| Sponsored Bulletin | $4.99 / 24 h | A bulletin shown to every member, labeled Sponsored |
| Tip jar | $3–$20 | A thank-you |
| Merch | your store | Footer + shop link, set `MERCH_URL` |
| Ads | AdSense | Home and Browse only, never profiles, never for Supporters |

### Turn on payments (Stripe)
1. Make an account at stripe.com. Stay in **Test mode** at first.
2. **Developers -> API keys**: copy the **Secret key** (`sk_test_...`) into Vercel as `STRIPE_SECRET_KEY`.
3. **Developers -> Webhooks -> Add endpoint**
   - URL: `https://www.bfrenz.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** (`whsec_...`) into Vercel as `STRIPE_WEBHOOK_SECRET`.
4. Redeploy. Test with card `4242 4242 4242 4242`, any future date, any CVC.
5. When it all works, repeat steps 2–3 in **Live mode** with the live keys and redeploy.

## Safety: Report, Block and the admin page

- Every profile, comment, bulletin, photo and message has a **Report** link. Reports go to **/admin**
  (the Admin link in the menu shows how many are open). Child-safety reports are marked Urgent and sorted first.
- **Remove** deletes the reported thing; **Dismiss** leaves it up. **Ban** logs the member out, hides their profile,
  friends-list spots, comments and bulletins, and blocks them from logging in (tick the box to delete everything they posted).
- Members can **Block** anyone from their profile page; manage the list at **/blocked** (link on Edit Profile).
- Admins are `FOUNDER_USERNAME` plus anyone in `ADMIN_USERNAMES` (comma separated).
- To get an email for each new report, set up Resend and set `REPORT_EMAIL` (or `CONTACT_EMAIL`).
- In the US, apparent child sexual exploitation must be reported to NCMEC: report.cybertip.org.

## Growth: sharing and invites

- **/invite** gives every member a personal link (`bfrenz.com/signup?ref=username`). Whoever joins with it
  becomes their fren automatically.
- Rewards (once the new member also adds a profile pic): 3 invites = a free premium theme, 10 = a free month of
  Supporter, 25 = the Pro Artist badge. Change them in `lib/invites.js`.
- Members get a **Share my profile** box on their own profile (copy link, text, WhatsApp, X, Facebook).

## Google (SEO)

- `/sitemap.xml` lists the main pages and every member profile; `/robots.txt` points Google at it and keeps private pages out.
- Google Search Console: add `https://www.bfrenz.com` as a URL-prefix property, choose the **HTML tag** check,
  copy just the `content="..."` value into Vercel as `GOOGLE_SITE_VERIFICATION`, redeploy, click **Verify**,
  then submit `sitemap.xml` under **Sitemaps**.

### Other switches
- `MERCH_URL`: link to your Printful / Spring / Fourthwall store.
- `NEXT_PUBLIC_ADSENSE_CLIENT` + `NEXT_PUBLIC_ADSENSE_SLOT`: from Google AdSense once your site is approved.
- `CONTACT_EMAIL`: shown on the Terms and Privacy pages.

**Before charging real money:** Vercel's free Hobby plan is for non-commercial use, so move to Pro.
The Terms and Privacy pages (`app/terms`, `app/privacy`) are templates; have them reviewed.

## What's in it

| Page | What it does |
|---|---|
| `/` | Landing page with login and "Cool New People" |
| `/signup`, `/login` | Accounts (passwords are hashed with bcrypt) |
| `/forgot`, `/reset` | Forgot password: emails a one-time reset link |
| `/shop` | Supporter, themes, boosts, tip jar, merch |
| `/terms`, `/privacy` | Terms of Service and Privacy Policy (templates) |
| `/home` | Your dashboard: new mail/request alerts, bulletin space, your Top 8 |
| `/username` | Profile: pic, mood, song, contact box, interests, blurbs, Top 8, comment wall |
| `/username/friends` | Full friends list |
| `/username/photos` | Photo album (upload, set as profile pic, delete) |
| `/edit` | Edit info, interests, pic, song and custom CSS |
| `/edit/top8` | Pick your Top 8 |
| `/requests` | Approve or deny friend requests |
| `/browse` | Newest members, who's online, search |
| `/bulletins` | Bulletins from you and your friends; post one to all friends |
| `/mail` | Inbox, sent, compose, read and reply |
| `/help` | How it works + the CSS class list for customizing |

**Rules built in:** only friends can comment on each other's profiles; bulletins are visible to the
author's friends; profile owners can delete any comment on their page; HTML in About Me, comments and
bulletins is allowed but scripts are stripped; custom CSS can't break out of the page's style block.
Light spam limits: one bulletin per minute and ten messages per minute per member.

## Run it on your own computer (optional)

```bash
cp .env.example .env      # then fill in DATABASE_URL and SESSION_SECRET
npm install
npx prisma db push        # creates the tables
npm run dev               # open http://localhost:3000
```

Without `BLOB_READ_WRITE_TOKEN`, uploads won't work locally, but members can still paste image and
song links.

## Changing the look

All site styles are in `app/globals.css`. The main colors are at the top:

```css
--orange: #ff7a1a;
--bg: #0b0b0c;
```

## Before you open it to the public

- Write a short Terms of Service and Privacy Policy page (you're storing emails and user content).
- Decide how you'll handle reports of abuse; there's no admin panel yet. You can view and edit any
  data with `npx prisma studio` or in the Neon dashboard.
- Uploaded songs can be copyrighted music. The upload screen reminds people to only share what they
  have the rights to, but you're the site operator, so consider a DMCA contact address.
