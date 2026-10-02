import { prisma } from '@/lib/db';
import { SURVEYS } from '@/lib/surveys';

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
    { url: `${SITE}/surveys`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE}/groups`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE}/potw`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE}/creators`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE}/blog`, changeFrequency: 'daily', priority: 0.6 },
    ...SURVEYS.map((sv) => ({ url: `${SITE}/surveys/${sv.slug}`, changeFrequency: 'monthly', priority: 0.4 })),
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

  let groups = [];
  let blogs = [];
  try {
    [groups, blogs] = await Promise.all([
      prisma.group.findMany({ where: { owner: { bannedAt: null } }, select: { slug: true, lastPostAt: true, createdAt: true }, take: 2000 }),
      prisma.blogPost.findMany({
        where: { visibility: 'public', author: { bannedAt: null } },
        select: { id: true, updatedAt: true, author: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
    ]);
  } catch (err) {
    console.error('[sitemap] groups/blogs failed:', err?.message);
  }

  return [
    ...pages,
    ...groups.map((g) => ({ url: `${SITE}/groups/${g.slug}`, lastModified: g.lastPostAt || g.createdAt, changeFrequency: 'daily', priority: 0.5 })),
    ...blogs.map((b) => ({ url: `${SITE}/${b.author.username}/blog/${b.id}`, lastModified: b.updatedAt, changeFrequency: 'monthly', priority: 0.4 })),
    ...members.map((m) => ({
      url: `${SITE}/${m.username}`,
      lastModified: m.lastSeen || m.createdAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    })),
  ];
}
