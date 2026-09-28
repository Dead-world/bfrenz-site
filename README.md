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

## What's in it

| Page | What it does |
|---|---|
| `/` | Landing page with login and "Cool New People" |
| `/signup`, `/login` | Accounts (passwords are hashed with bcrypt) |
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
