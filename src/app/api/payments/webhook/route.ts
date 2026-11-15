import { fulfillPayment, getPaymentRecord, updatePaymentRecord } from '@/lib/db/payments';
import { generateTBankToken } from '@/lib/payments/tbank';
import crypto from 'node:crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { TerminalKey, PaymentId, OrderId, Amount, Status, Token } = body;

    const terminalPassword = process.env.T_TERMINAL_PASSWORD;
    const expectedTerminalKey = process.env.T_TERMINAL_KEY;
    if (!terminalPassword || !expectedTerminalKey || !Token || TerminalKey !== expectedTerminalKey) {
      console.warn('Incomplete or invalid T-Bank notification credentials');
      return new Response('FAIL', { status: 401 });
    }

    const expectedToken = generateTBankToken(body, terminalPassword);
    const actual = Buffer.from(String(Token));
    const expected = Buffer.from(expectedToken);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
      console.warn('Invalid T-Bank notification token signature');
      return new Response('FAIL', { status: 401 });
    }

    if (PaymentId) {
      const record = await getPaymentRecord(PaymentId);
      if (!record) {
        console.warn('Notification received for unknown payment', PaymentId);
        return new Response('OK', { status: 200 });
      }
      if (String(OrderId) !== record.orderId || Number(Amount) !== Math.round(record.amount * 100)) {
        console.warn('T-Bank notification does not match stored order', PaymentId);
        return new Response('FAIL', { status: 400 });
      }

      if (Status === 'CONFIRMED') {
        await fulfillPayment(PaymentId);
      } else {
        await updatePaymentRecord(PaymentId, { status: Status });
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('T-Bank webhook error:', error);
    return new Response('ERROR', { status: 500 });
  }
}
