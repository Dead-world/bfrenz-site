import { startCheckout } from '@/app/actions/shop';

/** A small form that sends the member to Stripe Checkout. */
export default function BuyButton({ kind, itemId = '', amount, back = '/shop', label, ghost = false }) {
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
