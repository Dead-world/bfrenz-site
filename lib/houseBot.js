import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { notify } from './push';
import { localDate } from './birthdays';
import { weeklySurvey } from './surveys';

/**
 * BFRENZ Bot: the site's own, clearly labeled account (🤖 BOT badge, isOfficial).
 * It never pretends to be a person. It welcomes new members, posts a daily prompt,
 * picks a real member's profile song as Song of the Day, and announces the weekly survey.
 * Its posts show in everyone's Feed (see lib/feed.js).
 */
export const BOT_USERNAME = (process.env.BOT_USERNAME || 'bfrenzbot').toLowerCase();

const BOT_PROFILE = {
  displayName: 'BFRENZ Bot',
  avatarUrl: '/bot-avatar.png',
  headline: "I'm the official BFRENZ bot 🤖 Not a real person!",
  mood: 'beep boop 🧡',
  aboutMe:
    "<b>Hi, I'm BFRENZ Bot!</b> 🤖<br>I'm an automated account run by the BFRENZ team. I'm <b>not a real person</b>.<br><br>" +
    'Every day I post a question for everyone to answer, pick a member\'s profile song as <b>Song of the Day</b>, ' +
    'announce the weekly survey and welcome new members.<br><br>Want your song picked? Add one to your profile!',
};

/** The bot account, created the first time it's needed. */
export async function getBot() {
  const existing = await prisma.user.findUnique({ where: { username: BOT_USERNAME } });
  if (existing) {
    if (!existing.isOfficial) return null; // a real member already has this name: never take it over
    // Bots made before the robot picture existed get it now.
    if (!existing.avatarUrl) {
      return prisma.user.update({ where: { id: existing.id }, data: { avatarUrl: BOT_PROFILE.avatarUrl } });
    }
    return existing;
  }
  return prisma.user.create({
    data: {
      username: BOT_USERNAME,
      email: `${BOT_USERNAME}@bot.bfrenz.invalid`,
      // Random password that is never stored or shown: nobody can log in as the bot.
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10), // a password nobody knows
      isOfficial: true,
      ...BOT_PROFILE,
    },
  });
}

// ---------------- welcome ----------------

const WELCOMES = [
  'Welcome to BFRENZ, {name}! 🧡 Start by picking a theme and a profile song (Edit Profile). Then go find your Top 8!',
  'Hey {name}, welcome to BFRENZ! 🎉 Tip: tap ✨ Glitter text under any comment box. Your page is going to look so good.',
  'Welcome aboard, {name}! 🤖 Try this week\'s survey and say hi in a group. See you around!',
];

/** Comment on a new member's page and give them a Day One Fren stamp. Never throws. */
export async function welcomeNewMember(user) {
  try {
    const bot = await getBot();
    if (!bot || bot.id === user.id) return;
    const text = WELCOMES[Math.floor(Math.random() * WELCOMES.length)].replace('{name}', user.displayName);
    await prisma.comment.create({ data: { profileId: user.id, authorId: bot.id, body: text } });
    await prisma.stampGift
      .create({ data: { stampSlug: 'day-one-fren', fromId: bot.id, toId: user.id, note: 'Welcome to BFRENZ! 🧡' } })
      .catch(() => {});
    const { joinLounge } = await import('./officialGroups');
    await joinLounge(user.id).catch(() => {});
  } catch (err) {
    console.error('[bot] welcome failed:', err?.message);
  }
}

// ---------------- daily posts ----------------

export const PROMPTS = [
  'Drop your profile song 👇 Best one gets added to my playlist (I can\'t hear, but I believe in you).',
  'Who\'s #1 in your Top 8 right now, and why? Be honest 👀',
  'What are you listening to RIGHT now? 🎧',
  'Rate the last person who commented on your page 1–10 😂',
  'Post a pic of your view right now 📸',
  'What\'s a song that instantly takes you back to 2007?',
  'Describe your mood in 3 emojis.',
  'What\'s the best concert you\'ve ever been to? 🎤',
  'Unpopular opinion time. Go 👇',
  'Tag a fren who always has the best playlists.',
  'What\'s your go-to karaoke song? 🎶',
  'Pizza or tacos? This decides everything.',
  'What\'s something small that made your day better this week?',
  'Show us your profile theme! Which one did you pick? 🎨',
  'If your life had a theme song, what would it be?',
  'What\'s the most underrated album of all time?',
  'Night owl 🦉 or early bird 🐦? Wrong answers only.',
  'What would your away message be right now? 🌙',
  'Best movie you\'ve seen this year? 🍿',
  'Say something nice about the person above you 🧡',
  'What app do you wish would just go back to how it used to be?',
  'Name an artist everyone on BFRENZ should know about 👇',
  'What\'s on your weekend plans list?',
  'Coffee, tea, or energy drink? ☕',
  'First CD (or download) you ever owned? Be honest 😅',
  'What\'s your hometown known for?',
  'Show off your best glitter text ✨ in the comments!',
  'What song is stuck in your head today?',
  'Favorite thing about BFRENZ so far? What should we add next? 🤖',
  'Who gave you your first stamp? Give one to someone today 🎟️',
];

function dayNumber(d = localDate()) {
  return Math.floor(Date.UTC(d.year, d.month - 1, d.day) / 86400000);
}

function startOfTodayUtc() {
  // Midnight Eastern, roughly: good enough to stop posting twice in one day.
  return new Date(Date.now() - 20 * 60 * 60 * 1000);
}

async function postedToday(botId, marker) {
  const found = await prisma.post.findFirst({
    where: { authorId: botId, createdAt: { gte: startOfTodayUtc() }, body: { contains: marker } },
    select: { id: true },
  });
  return !!found;
}

/** Picks a real member's profile song (artists first), not one used in the last 60 days. */
async function pickSongOfTheDay(botId) {
  const recent = await prisma.post.findMany({
    where: { authorId: botId, songUrl: { not: '' }, createdAt: { gte: new Date(Date.now() - 60 * 86400000) } },
    select: { songUrl: true },
  });
  const used = new Set(recent.map((r) => r.songUrl));
  const pool = await prisma.user.findMany({
    where: { bannedAt: null, isOfficial: false, songUrl: { not: '' } },
    select: { id: true, username: true, displayName: true, songUrl: true, songTitle: true, songArtist: true, isArtist: true, lastSeen: true },
    orderBy: { lastSeen: { sort: 'desc', nulls: 'last' } },
    take: 300,
  });
  const fresh = pool.filter((u) => !used.has(u.songUrl));
  const list = fresh.filter((u) => u.isArtist).length ? fresh.filter((u) => u.isArtist) : fresh;
  if (!list.length) return null;
  return list[dayNumber() % list.length];
}

/** The bot's daily posts. Safe to run more than once a day (it skips what's already posted). */
export async function runDailyBot() {
  const bot = await getBot();
  if (!bot) return { skipped: `username @${BOT_USERNAME} belongs to a real member` };
  const done = [];

  // 1) Question of the day
  if (!(await postedToday(bot.id, '💬 Question of the day'))) {
    const q = PROMPTS[dayNumber() % PROMPTS.length];
    await prisma.post.create({ data: { authorId: bot.id, body: `💬 Question of the day: ${q}` } });
    done.push('prompt');
  }

  // 2) Song of the Day (a real member's own profile song)
  if (!(await postedToday(bot.id, '🎵 Song of the Day'))) {
    const pick = await pickSongOfTheDay(bot.id);
    if (pick) {
      const label = [pick.songTitle, pick.songArtist].filter(Boolean).join(' by ') || 'their profile song';
      await prisma.post.create({
        data: {
          authorId: bot.id,
          body: `🎵 Song of the Day: ${label}, from @${pick.username}'s page! Go show some love 🧡 https://www.bfrenz.com/${pick.username}`,
          songUrl: pick.songUrl,
        },
      });
      notify(pick.id, {
        title: '🎵 Your song is BFRENZ Song of the Day!',
        body: 'Everyone is seeing it in their Feed today.',
        url: `/${pick.username}`,
      });
      done.push(`song:${pick.username}`);
    }
  }

  // 3) Mondays: the new weekly survey
  const today = localDate();
  const isMonday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay() === 1;
  if (isMonday && !(await postedToday(bot.id, '📝 New survey'))) {
    const s = weeklySurvey();
    await prisma.post.create({
      data: { authorId: bot.id, body: `📝 New survey of the week: ${s.emoji} ${s.title}! ${s.blurb} Take it here: https://www.bfrenz.com/surveys/${s.slug}` },
    });
    done.push('survey');
  }
  return { posted: done };
}
