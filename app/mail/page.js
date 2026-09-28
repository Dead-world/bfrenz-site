import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import MailTabs from '@/components/MailTabs';
import Notice from '@/components/Notice';
import { fmtDate } from '@/lib/util';

export const metadata = { title: 'Mail | BFRENZ.com' };

export default async function InboxPage({ searchParams }) {
  const me = await requireUser();
  const sp = await searchParams;
  const messages = await prisma.message.findMany({
    where: { recipientId: me.id, recipientDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { sender: true },
  });

  return (
    <div>
      <MailTabs on="inbox" />
      <Notice sp={sp} />
      <div className="box">
        <div className="box-h">Inbox</div>
        {messages.length === 0 ? (
          <div className="box-b muted">No messages yet.</div>
        ) : (
          <table className="list">
            <thead>
              <tr><th>From</th><th>Subject</th><th>Date</th><th /></tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} className={m.read ? '' : 'unread'}>
                  <td><Link href={`/${m.sender.username}`}>{m.sender.displayName}</Link></td>
                  <td><Link href={`/mail/${m.id}`}>{m.subject}</Link></td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.createdAt)}</td>
                  <td>{!m.read && <span className="new-badge">New</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
