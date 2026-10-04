'use server';

import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { str, withParam } from '@/lib/util';
import { COSMETIC_KINDS, getCosmetic, ownsCosmetic } from '@/lib/cosmetics';
import { cleanDesign } from '@/lib/design';

const PAGE = '/edit?tab=design';

/**
 * Use a frame / cursor trail / falling effect. If it costs coins and isn't owned yet, it's bought
 * first (the coins come off in one step that only works if you have enough). Empty slug = take it off.
 */
export async function applyCosmetic(formData) {
  const me = await requireUser();
  const kind = str(formData, 'kind', 10);
  const slug = str(formData, 'slug', 30);
  const k = COSMETIC_KINDS[kind];
  if (!k) redirect(PAGE);
  const back = `${PAGE}#${kind}`;
  if (!slug) {
    await prisma.user.update({ where: { id: me.id }, data: { [k.field]: '' } });
    redirect(`${PAGE}&saved=1#${kind}`);
  }
  const c = getCosmetic(kind, slug);
  if (!c) redirect(withParam(PAGE, 'error', 'That item isn’t available.'));

  if (!ownsCosmetic(me, kind, slug)) {
    const paid = await prisma.user.updateMany({ where: { id: me.id, coins: { gte: c.coins } }, data: { coins: { decrement: c.coins } } });
    if (!paid.count) redirect(withParam(PAGE, 'error', `You need 🪙 ${c.coins} coins for ${c.name}. Get coins at bfrenz.com/coins.`) + `#${kind}`);
    await prisma.user.update({ where: { id: me.id }, data: { cosmetics: { push: `${kind}:${slug}` }, [k.field]: slug } });
    redirect(`${PAGE}&bought=${encodeURIComponent(c.name)}#${kind}`);
  }
  await prisma.user.update({ where: { id: me.id }, data: { [k.field]: slug } });
  redirect(`${PAGE}&saved=1#${kind}`);
}

/** Save the "Design my profile" colors, font and corners (or clear them with reset). */
export async function saveDesign(formData) {
  const me = await requireUser();
  const reset = formData.get('reset') === '1';
  const d = reset
    ? null
    : cleanDesign({
        bg: formData.get('bg'),
        bg2: formData.get('useBg2') ? formData.get('bg2') : '',
        box: formData.get('box'),
        boxAlpha: formData.get('boxAlpha'),
        text: formData.get('text'),
        accent: formData.get('accent'),
        border: formData.get('border'),
        font: formData.get('font'),
        corners: formData.get('corners'),
      });
  await prisma.user.update({ where: { id: me.id }, data: { design: d ?? Prisma.DbNull } });
  redirect(`${PAGE}&saved=1#colors`);
}
