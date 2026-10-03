import { prisma } from './db';
import { getBot } from './houseBot';

/**
 * Starter groups run by the BFRENZ Bot (labeled Official). Site admins moderate them.
 * Each gets an icon in /public/group-icons/<slug>.svg and a pinned welcome post.
 */
export const OFFICIAL_GROUPS = [
  { slug: 'bfrenz-lounge', name: 'BFRENZ Lounge', category: 'Other', description: "The main hangout. New here? Introduce yourself, ask questions, and meet everyone. 🧡", welcome: "Welcome to the Lounge! 🧡 Introduce yourself below: name, where you're from, and your current profile song." },
  { slug: 'top-8-drama', name: 'Top 8 Drama', category: 'Memes & Fun', description: "Who's in your Top 8, who got bumped, and who's still mad about it. 👀", welcome: "Spill it 👀 Who just made your Top 8, and who got kicked out?" },
  { slug: 'show-off-your-profile', name: 'Show Off Your Profile', category: 'Art & Design', description: 'Post your page, rate each other\'s layouts, and trade theme and custom CSS tips. 🎨', welcome: 'Drop a link to your page 🎨 Best layouts get featured. Share your custom CSS tricks too!' },
  { slug: 'profile-song-swap', name: 'Profile Song Swap', category: 'Music', description: 'Share your profile song and find your next one. 🎵', welcome: "What's your profile song right now? 🎵 Post it and find something new from everyone else's." },
  { slug: 'independent-artists', name: 'Independent Artists', category: 'Music', description: 'Artists, rappers, singers and bands: share your music, collab, and support each other. 🎤', welcome: 'Post your latest song and one thing about you 🎤 Then go listen to someone else\'s. Support goes both ways!' },
  { slug: 'djs-and-producers', name: 'DJs & Producers', category: 'Electronic & DJs', description: 'Mixes, beats, gear talk and gigs. 🎧', welcome: 'Share your latest mix or beat 🎧 What are you working on right now?' },
  { slug: 'hip-hop-heads', name: 'Hip Hop Heads', category: 'Hip Hop', description: 'New drops, classics and debates. Top 5 dead or alive? 🔥', welcome: 'Top 5 rappers, dead or alive. Go 🔥' },
  { slug: 'rock-punk-and-emo', name: 'Rock, Punk & Emo', category: 'Rock & Punk', description: 'Pop punk, emo, metal, rock. If it has guitars, it belongs here. 🤘', welcome: "What album got you through middle school? 🤘 No judgment (ok, maybe a little)." },
  { slug: 'pop-fans', name: 'Pop Fans', category: 'Pop', description: 'Album drops, tour talk and fan theories. ✨', welcome: 'Which pop album has no skips? ✨ Defend your answer.' },
  { slug: 'r-and-b-lounge', name: 'R&B Lounge', category: 'R&B', description: 'Slow jams, new R&B and throwbacks. 💜', welcome: 'Drop the R&B song you could play on repeat forever 💜' },
  { slug: 'country-roads', name: 'Country Roads', category: 'Country', description: 'Country fans, all eras. 🤠', welcome: "Best country song for a long drive? 🤠" },
  { slug: '2000s-kids', name: '2000s Kids', category: 'Nostalgia', description: 'Flip phones, burned CDs, away messages and everything we miss. 📼', welcome: 'Name one thing from the 2000s you wish would come back 📼' },
  { slug: 'gamers', name: 'Gamers', category: 'Gaming', description: 'What are you playing? Find people to squad up with. 🎮', welcome: "What are you playing right now, and what's your gamertag? 🎮" },
  { slug: 'movies-and-tv', name: 'Movies & TV', category: 'Movies & TV', description: "What to watch, what to skip, and what everyone's talking about. 🍿", welcome: 'Best thing you watched this month? 🍿 No spoilers without a warning!' },
  { slug: 'anime-and-manga', name: 'Anime & Manga', category: 'Anime', description: 'Currently watching, reading, and recommending. 🌸', welcome: "What's your comfort anime? 🌸" },
  { slug: 'creators-corner', name: 'Creators Corner', category: 'Other', description: 'YouTubers, streamers, TikTokers and podcasters helping each other grow. 🎥', welcome: 'Drop your channel and what you make 🎥 Then follow 3 other creators here!' },
  { slug: 'fits-and-fashion', name: 'Fits & Fashion', category: 'Fashion', description: 'Outfit pics, thrift finds and style inspo. 👟', welcome: 'Show us your best fit this week 👟' },
  { slug: 'sports-talk', name: 'Sports Talk', category: 'Sports', description: 'Games, trades, fantasy leagues and trash talk. 🏀', welcome: 'Who are you rooting for this season? 🏀 Trash talk welcome, keep it friendly.' },
  { slug: 'memes', name: 'Memes', category: 'Memes & Fun', description: 'Post the funniest thing on your camera roll. 😂', welcome: "Post a meme that describes your week 😂" },
  { slug: 'night-owls', name: 'Night Owls', category: 'Other', description: "Up way too late? Same. Come hang out. 🌙", welcome: "Why are you still up? 🌙 Tell us what you're doing right now." },
];

export const LOUNGE_SLUG = 'bfrenz-lounge';
export const iconFor = (slug) => `/group-icons/${slug}.svg`;

/**
 * Creates any official groups that don't exist yet. Safe to run again.
 * A group whose web address a member already took is skipped, never taken over.
 */
export async function createOfficialGroups() {
  const bot = await getBot();
  if (!bot) return { created: 0, skipped: OFFICIAL_GROUPS.length, reason: 'bot username is taken' };
  const existing = new Set(
    (await prisma.group.findMany({ where: { slug: { in: OFFICIAL_GROUPS.map((g) => g.slug) } }, select: { slug: true } })).map((g) => g.slug),
  );
  let created = 0;
  for (const g of OFFICIAL_GROUPS) {
    if (existing.has(g.slug)) continue;
    const group = await prisma.group.create({
      data: { slug: g.slug, name: g.name, description: g.description, category: g.category, avatarUrl: iconFor(g.slug), ownerId: bot.id, memberCount: 1 },
    });
    await prisma.groupMember.create({ data: { groupId: group.id, userId: bot.id, role: 'owner' } });
    await prisma.groupPost.create({ data: { groupId: group.id, authorId: bot.id, body: g.welcome, pinned: true } });
    created++;
  }
  return { created, skipped: OFFICIAL_GROUPS.length - created };
}

let checked = false;
/** First visit to /groups: set up the official groups if none exist yet (so a deleted one isn't brought back). */
export async function ensureOfficialGroups() {
  if (checked) return;
  checked = true;
  try {
    const any = await prisma.group.count({ where: { slug: { in: OFFICIAL_GROUPS.map((g) => g.slug) }, owner: { isOfficial: true } } });
    if (!any) await createOfficialGroups();
  } catch (err) {
    checked = false;
    console.error('[groups] official setup failed:', err?.message);
  }
}

/** New members land in the Lounge so their first group isn't empty. They can leave any time. */
export async function joinLounge(userId) {
  const lounge = await prisma.group.findUnique({ where: { slug: LOUNGE_SLUG }, select: { id: true, owner: { select: { isOfficial: true } } } });
  if (!lounge?.owner?.isOfficial) return;
  const has = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: lounge.id, userId } } });
  if (has) return;
  await prisma.$transaction([
    prisma.groupMember.create({ data: { groupId: lounge.id, userId } }),
    prisma.group.update({ where: { id: lounge.id }, data: { memberCount: { increment: 1 } } }),
  ]);
}
