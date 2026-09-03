import { NextResponse } from 'next/server';
import { getTariffById, getDefaultTariff, getCoursePaymentConfig } from '@/lib/payments/tariffs';
import { initTBankPayment } from '@/lib/payments/tbank';
import { savePaymentRecord } from '@/lib/db/payments';
import { normalizeEmail } from '@/lib/db/grants';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { courseKey } from '@/lib/slug';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tariffId, email, courseSlug } = body;

    const normalizedEmail = normalizeEmail(email || '');
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Пожалуйста, введите корректный email' }, { status: 400 });
    }

    const course = courseSlug
      ? (await getPublishedCoursesWithLessons()).find(
          (item) => courseKey(item) === courseSlug || item.id === courseSlug
        )
      : null;
    if (courseSlug && !course) {
      return NextResponse.json({ error: 'Курс не найден' }, { status: 400 });
    }

    const cookieHeader = req.headers.get('cookie') || '';
    const timerCookieMatch = cookieHeader.match(/vibe_price_timer_end=(\d+)/);
    let isVibeTimerExpired = false;
    if (timerCookieMatch) {
      const expiry = Number(timerCookieMatch[1]);
      if (!isNaN(expiry) && Date.now() >= expiry) {
        isVibeTimerExpired = true;
      }
    }

    const trustedCourseKey = course ? courseKey(course) : undefined;
    const tariff = tariffId
      ? getTariffById(tariffId, trustedCourseKey, { isVibeTimerExpired })
      : getDefaultTariff(trustedCourseKey, { isVibeTimerExpired });
    if (!tariff) {
      return NextResponse.json({ error: 'Тариф не найден для выбранного курса' }, { status: 400 });
    }
    const trustedCourseTitle = getCoursePaymentConfig(trustedCourseKey)?.courseTitle || course?.title;
    const description = trustedCourseTitle
      ? `Обучение: ${trustedCourseTitle} (${tariff.title})`
      : `Подписка Gelato: ${tariff.title}`;

    const orderId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // 1. Инициализация в Т-Банке
    const initRes = await initTBankPayment({
      amount: tariff.price,
      orderId,
      email: normalizedEmail,
      description,
      tariffId: tariff.id,
    });

    const paymentId = String(initRes.PaymentId);

    const paymentUrl = initRes.PaymentURL || '';
    if (!paymentUrl) {
      throw new Error('Т-Банк не вернул ссылку на платёжную форму');
    }

    // Запись сохраняем до редиректа; все способы оплаты обрабатывает форма Т-Банка.
    await savePaymentRecord({
      paymentId,
      orderId,
      email: normalizedEmail,
      amount: tariff.price,
      tariffId: tariff.id,
      tariffTitle: tariff.title,
      periodDays: tariff.periodDays,
      courseIds: course ? [course.id] : null,
      courseSlug: trustedCourseKey ?? null,
      status: 'NEW',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      paymentUrl,
    });

    return NextResponse.json({
      success: true,
      paymentId,
      orderId,
      amount: tariff.price,
      tariffTitle: tariff.title,
      periodDays: tariff.periodDays,
      paymentUrl,
    });
  } catch (error: any) {
    console.error('Init payment route error:', error);
    return NextResponse.json(
      { error: error?.message || 'Не удалось инициализировать оплату' },
      { status: 500 }
    );
  }
}
