import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deleteMessage } from '@/app/actions/social';
import MailTabs from '@/components/MailTabs';
import { Pic } from '@/components/Avatar';
import { fmtDate } from '@/lib/util';

export const metadata = { title: 'Message | BFRENZ.com' };

export default async function MessagePage({ params }) {
  const me = await requireUser();
  const { id } = await params;
  const m = await prisma.message.findUnique({ where: { id }, include: { sender: true, recipient: true } });
  const isRecipient = m?.recipientId === me.id && !m.recipientDeleted;
  const isSender = m?.senderId === me.id && !m.senderDeleted;
  if (!m || (!isRecipient && !isSender)) notFound();

  if (isRecipient && !m.read) {
    await prisma.message.update({ where: { id }, data: { read: true } });
  }
  const other = isRecipient ? m.sender : m.recipient;
  const replySubject = m.subject.startsWith('RE:') ? m.subject : `RE: ${m.subject}`;

  return (
    <div>
      <MailTabs on={isRecipient ? 'inbox' : 'sent'} />
      <div className="box">
        <div className="box-h">{m.subject}</div>
        <table className="comments">
          <tbody>
            <tr>
              <td className="who">
                <div className="small muted">{isRecipient ? 'From' : 'To'}</div>
                <Link href={`/${other.username}`}>{other.displayName}</Link>
                <Link href={`/${other.username}`}><Pic user={other} size={72} /></Link>
              </td>
              <td className="said">
                <div className="when">{fmtDate(m.createdAt)}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                <div className="actions" style={{ marginTop: 16 }}>
                  {isRecipient && (
                    <Link
                      href={`/mail/compose?to=${m.sender.username}&subject=${encodeURIComponent(replySubject)}`}
                      className="btn small-btn"
                    >
                      Reply
                    </Link>
                  )}
                  <form action={deleteMessage}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" className="btn ghost small-btn">Delete</button>
                  </form>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
