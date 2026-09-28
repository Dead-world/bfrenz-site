import { requireUser } from '@/lib/auth';
import { sendMessage } from '@/app/actions/social';
import MailTabs from '@/components/MailTabs';
import Notice from '@/components/Notice';

export const metadata = { title: 'Compose | BFRENZ.com' };

export default async function ComposePage({ searchParams }) {
  await requireUser();
  const sp = await searchParams;
  const to = String(sp?.to || '').slice(0, 40);
  const subject = String(sp?.subject || '').slice(0, 150);

  return (
    <div>
      <MailTabs on="compose" />
      <Notice sp={sp} />
      <form action={sendMessage} className="box">
        <div className="box-h">New message</div>
        <div className="box-b">
          <table className="form-table">
            <tbody>
              <tr>
                <td className="lbl">To</td>
                <td><input type="text" name="to" defaultValue={to} placeholder="username" required maxLength={40} /></td>
              </tr>
              <tr>
                <td className="lbl">Subject</td>
                <td><input type="text" name="subject" defaultValue={subject} maxLength={150} style={{ width: '100%' }} /></td>
              </tr>
              <tr>
                <td className="lbl">Message</td>
                <td><textarea name="body" rows={10} maxLength={10000} required /></td>
              </tr>
              <tr>
                <td />
                <td><button className="btn" type="submit">Send</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </form>
    </div>
  );
}
