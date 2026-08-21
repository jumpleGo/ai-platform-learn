import { NextResponse } from 'next/server';
import { isBannerSlot, isVariantId } from '@/lib/banners';
import { recordBannerClick, recordBannerShown } from '@/lib/db/banner-stats';

const ID = /^[\w-]{1,64}$/;
const MAX_HREF = 300;
const MAX_LABEL = 80;

// Приёмник счётчиков A/B-теста баннеров урока. Клиент шлёт сюда показ и клики
// через sendBeacon — обычный fetch не доживает до конца навигации по ссылке.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { courseId, lessonId, slot, variantId, type, href, label } = (body ?? {}) as Record<string, unknown>;
  if (typeof courseId !== 'string' || !ID.test(courseId)) return NextResponse.json({ ok: false }, { status: 400 });
  if (typeof lessonId !== 'string' || !ID.test(lessonId)) return NextResponse.json({ ok: false }, { status: 400 });
  if (!isBannerSlot(slot) || !isVariantId(variantId)) return NextResponse.json({ ok: false }, { status: 400 });

  if (type === 'shown') {
    await recordBannerShown(courseId, lessonId, slot, variantId);
    return NextResponse.json({ ok: true });
  }
  if (type === 'click') {
    if (typeof href !== 'string' || !/^https?:\/\//.test(href) || href.length > MAX_HREF) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const text = typeof label === 'string' ? label.trim().slice(0, MAX_LABEL) : '';
    await recordBannerClick(courseId, lessonId, slot, variantId, href, text);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 400 });
}
