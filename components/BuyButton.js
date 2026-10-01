import { startCheckout } from '@/app/actions/shop';
import { inAndroidApp } from '@/lib/appMode';

/**
 * A small form that sends the member to Stripe Checkout.
 * Inside the Android app it shows a note instead: Google Play only allows its own
 * billing for digital items bought in an app.
 */
export default async function BuyButton({ kind, itemId = '', amount, back = '/shop', label, ghost = false }) {
  if (await inAndroidApp()) {
    return <span className="small muted not-in-app" title="Purchases aren't available in the Android app">Not available in the app</span>;
  }
  return (
    <form action={startCheckout} className="inline">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="itemId" value={itemId} />
      {amount != null && <input type="hidden" name="amount" value={amount} />}
      <input type="hidden" name="back" value={back} />
      <button type="submit" className={`btn small-btn${ghost ? ' ghost' : ''}`}>{label}</button>
    </form>
  );
}
