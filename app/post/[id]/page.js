import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canSeePost, postInclude } from '@/lib/feed';
import { isAdmin } from '@/lib/moderation';
import { PostCard } from '@/components/FeedItem';
import { attachPostReactions } from '@/lib/reactions';
import Notice from '@/components/Notice';

export const metadata = { title: 'Post | BFRENZ.com', robots: { index: false } };

export default async function PostPage({ params, searchParams }) {
  const me = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const admin = isAdmin(me);
  const inc = postInclude(me.id);
  const post = await prisma.post.findUnique({
    where: { id },
    include: { ...inc, comments: { where: { parentId: null }, orderBy: { createdAt: 'asc' }, take: 300, include: { ...inc.comments.include, replies: { ...inc.comments.include.replies, take: 200 } } } },
  });
  if (!post) notFound();
  const author = await prisma.user.findUnique({ where: { id: post.authorId }, select: { bannedAt: true } });
  if ((author?.bannedAt && !admin) || !(await canSeePost(me, post, admin))) notFound();
  await attachPostReactions([post], me.id);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="small" style={{ marginBottom: 10 }}>
        <Link href="/home">&laquo; Back to your feed</Link>
      </div>
      <Notice sp={sp} />
      <PostCard post={post} me={me} back={`/post/${post.id}`} admin={admin} allComments />
    </div>
  );
}
