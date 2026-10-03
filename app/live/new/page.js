import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { canGoLive, LIVE_MIN_AGE } from '@/lib/live';
import { rtcConfigured } from '@/lib/rtc';
import LiveStudio from '@/components/LiveStudio';

export const metadata = { title: 'Go Live | BFRENZ.com', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function GoLivePage() {
  const me = await requireUser();
  const can = canGoLive(me);
  if (!can.ok) {
    return (
      <div className="box" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="box-h">🔴 Go Live</div>
        <div className="box-b">
          {can.reason === 'age-missing' ? (
            <>Going live is for members {LIVE_MIN_AGE} and older. <Link href="/edit">Add your age to your profile</Link>, then come back.</>
          ) : (
            <>Going live is for members {LIVE_MIN_AGE} and older. You can still <Link href="/live">watch streams</Link> and video call your frenz!</>
          )}
        </div>
      </div>
    );
  }
  return <LiveStudio me={{ name: me.displayName }} browserOk={rtcConfigured()} />;
}
