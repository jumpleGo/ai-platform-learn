import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { findUserByEmail } from '@/lib/db/users';
import { applyGrantToUser, savePendingGrant, normalizeEmail } from '@/lib/db/grants';
import { sendPaymentSuccessEmail } from '@/lib/email/mailer';
import { EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/posthog-server';

export interface PaymentDoc {
  paymentId: string;
  orderId: string;
  email: string;
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
 * Выполняет выдачу доступа по платежу:
 * 1. Находит пользователя или сохраняет pending grant
 * 2. Отправляет email подтверждение
 * 3. Обновляет статус платежа
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
    return { success: true, message: 'Доступ уже был выдан ранее' };
  }
  if (record.fulfillmentStartedAt !== now) {
    return { success: false, message: 'Выдача доступа уже выполняется' };
  }

  const email = normalizeEmail(record.email);
  const plan = record.tariffTitle || 'Подписка';
  const periodDays = record.periodDays || 30;

  let user: Awaited<ReturnType<typeof findUserByEmail>> = null;
  try {
    // 1. Проверяем, зарегистрирован ли пользователь
    user = await findUserByEmail(email);

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

    // Закрываем lease до необязательных side effects: повторное уведомление их не продублирует.
    await updatePaymentRecord(paymentId, {
      status: 'CONFIRMED',
      fulfilledAt: now,
      fulfillmentStartedAt: null,
    });
  } catch (error) {
    // Ошибка выдачи не должна блокировать повтор банка на пять минут.
    await updatePaymentRecord(paymentId, { fulfillmentStartedAt: null });
    throw error;
  }

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

  // 2. Отправляем email подтверждение
  try {
    await sendPaymentSuccessEmail({
      to: email,
      planName: plan,
      periodDays,
    });
  } catch (err) {
    console.error('Failed to send success email in fulfillPayment:', err);
  }

  return { success: true, message: 'Доступ успешно выдан' };
}
