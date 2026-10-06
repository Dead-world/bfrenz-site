import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { merchProduct, MERCH_SHIPPING, MERCH_MAX_QTY } from '@/lib/merch';
import MerchPicker from '@/components/MerchPicker';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = await merchProduct(id);
  if (!p) return { title: 'Merch | BFRENZ.com' };
  return { title: `${p.name} | BFRENZ Merch`, openGraph: { title: p.name, images: p.img ? [p.img] : [] } };
}

export default async function MerchItemPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const [me, product] = await Promise.all([getCurrentUser(), merchProduct(id)]);
  if (!product) notFound();
  return (
    <div className="merch">
      <div className="small" style={{ margin: '4px 0 10px' }}><Link href="/merch">← All merch</Link></div>
      {sp?.error && <div className="notice error">{String(sp.error).slice(0, 500)}</div>}
      <div className="box"><div className="box-b">
        <MerchPicker product={product} shipping={MERCH_SHIPPING} maxQty={MERCH_MAX_QTY} canBuy={!!me} signInHref={`/login?next=/merch/${product.id}`} />
      </div></div>
    </div>
  );
}
