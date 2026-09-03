import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { findUserByEmail } from '@/lib/db/users';
import { applyGrantToUser, savePendingGrant, normalizeEmail } from '@/lib/db/grants';
import { sendSelfPacedAccessEmail, sendSupportStreamEnrollmentEmail } from '@/lib/email/mailer';
import { EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/posthog-server';

export interface PaymentDoc {
  paymentId: string;
  orderId: string;
  email: string;
  telegram?: string | null;
  hasSupport?: boolean;
  startDate?: string | null;
  amount: number;
  tariffId: string;
  tariffTitle: string;
  periodDays: number;
  courseIds: string[] | null;
  courseSlug?: string | null;
  status: 'NEW' | 'CONFIRMED' | 'REJECTED' | 'CANCELED' | 'MANUAL_CLAIMED' | string;
  createdAt: number;
  updatedAt: number;
  fulfilledAt?: number | null;
  fulfillmentStartedAt?: number | null;
  paymentUrl?: string | null;
  metadata?: Record<string, any>;
}

import { generateRandomPassword } from '@/lib/payments/password';
export { generateRandomPassword };

export async function savePaymentRecord(payment: PaymentDoc) {
  await adminDb.doc(`payments/${payment.paymentId}`).set(payment);
}

export async function getPaymentRecord(paymentId: string | number): Promise<PaymentDoc | null> {
  const snap = await adminDb.doc(`payments/${paymentId}`).get();
  return snap.exists ? (snap.data() as PaymentDoc) : null;
}

export async function getPaymentRecordByOrderId(orderId: string): Promise<PaymentDoc | null> {
  const snap = await adminDb
    .collection('payments')
    .where('orderId', '==', orderId)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as PaymentDoc);
}

export async function updatePaymentRecord(paymentId: string | number, updates: Partial<PaymentDoc>) {
  await adminDb.doc(`payments/${paymentId}`).set(
    {
      ...updates,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

/**
 * Выполняет обработку подтверждённого платежа:
 * 1. Тариф с поддержкой: фиксируем запись и Telegram, доступ СРАЗУ НЕ ВЫДАЁМ (курс стартует позже, доступ выдаётся вручную),
 *    отправляем письмо с подтверждением бронирования места и контактов.
 * 2. Тариф без поддержки: выдаём доступ СРАЗУ (создаём аккаунт с паролем, если ещё нет),
 *    отправляем письмо «Заходи и учись» с паролем и ссылкой.
 */
export async function fulfillPayment(paymentId: string | number): Promise<{ success: boolean; message: string }> {
  const paymentRef = adminDb.doc(`payments/${paymentId}`);
  const now = Date.now();
  const record = await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(paymentRef);
    if (!snap.exists) return null;
    const payment = snap.data() as PaymentDoc;
    if (payment.fulfilledAt) return payment;

    // Lease защищает от одновременной обработки webhook и status polling.
    const leaseIsActive = payment.fulfillmentStartedAt
      && now - payment.fulfillmentStartedAt < 5 * 60_000;
    if (leaseIsActive) return payment;
    transaction.update(paymentRef, { fulfillmentStartedAt: now, updatedAt: now });
    return { ...payment, fulfillmentStartedAt: now };
  });
  if (!record) {
    return { success: false, message: 'Платёж не найден' };
  }

  if (record.fulfilledAt) {
    return { success: true, message: 'Платёж уже был обработан ранее' };
  }
  if (record.fulfillmentStartedAt !== now) {
    return { success: false, message: 'Обработка платежа уже выполняется' };
  }

  const email = normalizeEmail(record.email);
  const plan = record.tariffTitle || 'Подписка';
  const periodDays = record.periodDays || 30;
  const hasSupport = Boolean(record.hasSupport);
  const telegram = record.telegram ?? null;
  const startDate = record.startDate || '14 сентября';

  try {
    // СЛУЧАЙ 1: ТАРИФ С ПОДДЕРЖКОЙ (Поток с сопровождением)
    if (hasSupport) {
      // Доступ сразу не выдаём, так как поток начнётся позже (доступ открывается вручную)
      await updatePaymentRecord(paymentId, {
        status: 'CONFIRMED',
        fulfilledAt: now,
        fulfillmentStartedAt: null,
      });

      try {
        await sendSupportStreamEnrollmentEmail({
          to: email,
          planName: plan,
          startDate,
          telegram,
        });
      } catch (err) {
        console.error('Failed to send support enrollment email:', err);
      }

      return { success: true, message: 'Место на потоке с поддержкой забронировано' };
    }

    // СЛУЧАЙ 2: ТАРИФ БЕЗ ПОДДЕРЖКИ (Самостоятельно) — доступ выдаём СРАЗУ
    let generatedPassword: string | null = null;
    let user = await findUserByEmail(email);

    if (!user) {
      // Проверяем, существует ли пользователь в Firebase Auth
      try {
        const authUser = await adminAuth.getUserByEmail(email);
        user = { uid: authUser.uid, email, displayName: authUser.displayName ?? '', role: 'user', partnerId: null, utm: null, createdAt: now };
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.message?.includes('no user')) {
          // Создаём новый аккаунт с читаемым надёжным паролем
          generatedPassword = generateRandomPassword();
          const createdAuthUser = await adminAuth.createUser({
            email,
            password: generatedPassword,
            emailVerified: true,
          });
          await adminDb.doc(`users/${createdAuthUser.uid}`).set({
            email,
            displayName: '',
            role: 'user',
            partnerId: null,
            utm: null,
            createdAt: now,
          });
          user = { uid: createdAuthUser.uid, email, displayName: '', role: 'user', partnerId: null, utm: null, createdAt: now };
        } else {
          console.warn('Firebase Auth getUserByEmail error:', err);
        }
      }
    }

    if (user) {
      await applyGrantToUser(
        user.uid,
        {
          plan,
          periodDays,
          partnerId: null,
          courseIds: record.courseIds ?? null,
          grantedBy: 'payment',
          source: 'manual',
        },
        now
      );
    } else {
      await savePendingGrant({
        email,
        plan,
        periodDays,
        partnerId: null,
        courseIds: record.courseIds ?? null,
        grantedBy: 'payment',
        createdAt: now,
      });
    }

    // Закрываем lease
    await updatePaymentRecord(paymentId, {
      status: 'CONFIRMED',
      fulfilledAt: now,
      fulfillmentStartedAt: null,
    });

    if (user) {
      try {
        await trackServer(user.uid, EVENTS.subscriptionActivated, {
          plan,
          periodDays,
          source: 'payment',
        });
      } catch (err) {
        console.error('Failed to track payment fulfillment:', err);
      }
    }

    // Отправляем красивое письмо с данными входа
    try {
      await sendSelfPacedAccessEmail({
        to: email,
        planName: plan,
        periodDays,
        password: generatedPassword,
        isNewAccount: Boolean(generatedPassword),
      });
    } catch (err) {
      console.error('Failed to send self-paced access email in fulfillPayment:', err);
    }

    return { success: true, message: 'Доступ успешно выдан' };
  } catch (error) {
    // Ошибка выдачи не должна блокировать повтор банка на пять минут.
    await updatePaymentRecord(paymentId, { fulfillmentStartedAt: null });
    throw error;
  }
}
