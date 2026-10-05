import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { renamedTo } from '@/lib/usernames';

/**
 * Every profile page (and its photos, videos, blog...) runs through here.
 * If the name in the link is someone's old username, send the visitor to their new one.
 */
export default async function ProfileLayout({ children, params }) {
  const { username } = await params;
  const name = String(username || '').toLowerCase();
  if (/^[a-z0-9_]{3,20}$/.test(name)) {
    const exists = await prisma.user.findUnique({ where: { username: name }, select: { id: true } });
    if (!exists) {
      const now = await renamedTo(name);
      if (now) {
        const path = (await headers()).get('x-pathname') || `/${name}`;
        redirect(path.replace(/^\/[^/]+/, `/${now}`));
      }
    }
  }
  return children;
}
