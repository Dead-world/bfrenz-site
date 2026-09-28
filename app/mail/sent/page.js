import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import MailTabs from '@/components/MailTabs';
import Notice from '@/components/Notice';
import { fmtDate } from '@/lib/util';

export const metadata = { title: 'Sent Mail | BFRENZ.com' };

export default async function SentPage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const messages = await prisma.message.findMany({
    where: { senderId: me.id, senderDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { recipient: true },
  });

  return (
    <div>
      <MailTabs on="sent" />
      <Notice sp={sp} />
      <div className="box">
        <div className="box-h">Sent</div>
        {messages.length === 0 ? (
          <div className="box-b muted">You haven&apos;t sent anything yet.</div>
        ) : (
          <table className="list">
            <thead>
              <tr><th>To</th><th>Subject</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td><Link href={`/${m.recipient.username}`}>{m.recipient.displayName}</Link></td>
                  <td><Link href={`/mail/${m.id}`}>{m.subject}</Link></td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.createdAt)}</td>
                  <td className="muted">{m.read ? 'Read' : 'Unread'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
