import Link from 'next/link';

export default function MailTabs({ on }) {
  return (
    <div className="tabs">
      <Link href="/mail" className={on === 'inbox' ? 'on' : ''}>Inbox</Link>
      <Link href="/mail/sent" className={on === 'sent' ? 'on' : ''}>Sent</Link>
      <Link href="/mail/compose" className={on === 'compose' ? 'on' : ''}>Compose</Link>
    </div>
  );
}
