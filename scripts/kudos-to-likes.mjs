// One-time move: old Kudos become Likes. Safe to run on every build (does nothing once they're moved).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
try {
  let moved = 0;
  for (;;) {
    const rows = await prisma.kudos.findMany({ select: { id: true, postId: true, userId: true, createdAt: true }, take: 5000 });
    if (!rows.length) break;
    await prisma.reaction.createMany({
      data: rows.map((r) => ({ key: `p-${r.postId}`, userId: r.userId, value: 1, createdAt: r.createdAt })),
      skipDuplicates: true,
    });
    await prisma.kudos.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    moved += rows.length;
  }
  if (moved) console.log(`BFRENZ: moved ${moved} kudos over to likes`);
} catch (e) {
  console.error('BFRENZ: kudos -> likes move skipped:', e?.message);
} finally {
  await prisma.$disconnect();
}
