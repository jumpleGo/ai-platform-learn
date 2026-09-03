import { NextResponse } from 'next/server';
import { getTBankState } from '@/lib/payments/tbank';
import {
  fulfillPayment,
  getPaymentRecord,
  getPaymentRecordByOrderId,
  updatePaymentRecord,
} from '@/lib/db/payments';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paymentId: requestedPaymentId, orderId } = body;

    if (!requestedPaymentId && !orderId) {
      return NextResponse.json({ error: 'paymentId or orderId is required' }, { status: 400 });
    }
    if (orderId && !/^\d{10,20}_\d{1,4}$/.test(String(orderId))) {
      return NextResponse.json({ error: 'Некорректный номер заказа' }, { status: 400 });
    }

    const record = requestedPaymentId
      ? await getPaymentRecord(requestedPaymentId)
      : await getPaymentRecordByOrderId(String(orderId));
    if (!record) {
      return NextResponse.json({ error: 'Платёж не найден' }, { status: 404 });
    }

    const paymentId = record.paymentId;

    const state = await getTBankState(paymentId);
    if (!state.Success) {
      throw new Error(state.Details || state.Message || 'Банк не вернул статус платежа');
    }
    if (
      String(state.PaymentId) !== String(paymentId)
      || (state.OrderId && state.OrderId !== record.orderId)
      || (state.Amount !== undefined && Number(state.Amount) !== Math.round(record.amount * 100))
    ) {
      throw new Error('Ответ банка не соответствует созданному платежу');
    }
    const status = state.Status;

    if (status === 'CONFIRMED') {
      const fulfillment = await fulfillPayment(paymentId);
      return NextResponse.json({
        success: true,
        status: 'CONFIRMED',
        confirmed: fulfillment.success,
        courseSlug: record.courseSlug ?? null,
      });
    }

    if (status === 'REJECTED' || status === 'CANCELED' || status === 'DEADLINE_EXPIRED') {
      await updatePaymentRecord(paymentId, { status });
      return NextResponse.json({
        success: true,
        status,
        confirmed: false,
        courseSlug: record.courseSlug ?? null,
      });
    }

    return NextResponse.json({
      success: true,
      status: status || 'PENDING',
      confirmed: false,
      courseSlug: record.courseSlug ?? null,
    });
  } catch (error: any) {
    console.error('Payment status route error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to check status' },
      { status: 500 }
    );
  }
}
