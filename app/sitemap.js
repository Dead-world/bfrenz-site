import { prisma } from '@/lib/db';

const SITE = (process.env.SITE_URL || 'https://www.bfrenz.com').replace(/\/+$/, '');

// Rebuilt at most once an hour so new members show up for Google.
export const revalidate = 3600;

export default async function sitemap() {
  const now = new Date();
  const pages = [
    { url: `${SITE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/signup`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/browse`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE}/shop`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE}/help`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ].map((p) => ({ ...p, lastModified: now }));

  let members = [];
  try {
    members = await prisma.user.findMany({
      where: { bannedAt: null },
      select: { username: true, lastSeen: true, createdAt: true },
      orderBy: { lastSeen: { sort: 'desc', nulls: 'last' } },
      take: 45000, // one sitemap file holds up to 50,000 links
    });
  } catch (err) {
    console.error('[sitemap] member list failed:', err?.message);
  }

  return [
    ...pages,
    ...members.map((m) => ({
      url: `${SITE}/${m.username}`,
      lastModified: m.lastSeen || m.createdAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    })),
  ];
}
