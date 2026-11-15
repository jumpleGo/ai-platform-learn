import 'server-only';
import { generateTBankToken } from '@/lib/payments/token';
import { SITE_URL } from '@/lib/site';

export { generateTBankToken };

const API_BASE_URL = (process.env.T_API_PAYMENT_BASE_URL || 'https://securepay.tinkoff.ru/v2')
  .replace(/\/+$/, '')
  .replace(/\/Init$/i, '');
const TERMINAL_KEY = process.env.T_TERMINAL_KEY || '';
const TERMINAL_PASSWORD = process.env.T_TERMINAL_PASSWORD || '';
const NOTIFICATION_URL = process.env.T_NOTIFICATION_URL || `${SITE_URL}/api/payments/webhook`;
const TAXATION = process.env.T_TAXATION || 'usn_income';
const QR_LIFETIME_MS = 15 * 60_000;

function tBankDateTime(timestamp: number): string {
  return new Date(timestamp).toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

export interface InitPaymentParams {
  amount: number; // в рублях
  orderId?: string;
  email: string;
  description: string;
  tariffId: string;
}

export interface InitPaymentResponse {
  Success: boolean;
  ErrorCode?: string;
  Message?: string;
  Details?: string;
  Amount?: number;
  OrderId?: string;
  PaymentId: string | number;
  PaymentURL?: string;
  Token?: string;
}

async function readTBankJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`T-Bank API returned non-JSON response (HTTP ${res.status})`);
  }
}

export async function initTBankPayment(params: InitPaymentParams): Promise<InitPaymentResponse> {
  if (!TERMINAL_KEY || !TERMINAL_PASSWORD) {
    throw new Error('T-Bank credentials (T_TERMINAL_KEY, T_TERMINAL_PASSWORD) are not configured');
  }

  const orderId = params.orderId || `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const amountInKopecks = Math.round(params.amount * 100);
  const description = params.description.slice(0, 140);

  const payload: Record<string, any> = {
    TerminalKey: TERMINAL_KEY,
    Amount: amountInKopecks,
    OrderId: orderId,
    Description: description,
    PayType: 'O',
    NotificationURL: NOTIFICATION_URL,
    SuccessURL: `${SITE_URL}/payment/result?result=success&orderId=${encodeURIComponent(orderId)}`,
    FailURL: `${SITE_URL}/payment/result?result=failed&orderId=${encodeURIComponent(orderId)}`,
    RedirectDueDate: tBankDateTime(Date.now() + QR_LIFETIME_MS),
    DATA: {
      Email: params.email,
      TariffId: params.tariffId,
    },
    Receipt: {
      Items: [
        {
          Name: description.slice(0, 128),
          Price: amountInKopecks,
          Quantity: 1,
          Amount: amountInKopecks,
          PaymentMethod: 'full_payment',
          PaymentObject: 'service',
          Tax: 'none',
        },
      ],
      Email: params.email,
      Taxation: TAXATION,
      Payments: {
        Electronic: amountInKopecks,
      },
    },
  };

  payload.Token = generateTBankToken(payload, TERMINAL_PASSWORD);

  const res = await fetch(`${API_BASE_URL}/Init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await readTBankJson(res);
  if (!data.Success) {
    console.error('T-Bank Init error:', JSON.stringify({
      ErrorCode: data.ErrorCode,
      Message: data.Message,
      Details: data.Details,
    }));
    const reason = data.Details || data.Message || 'Неизвестная ошибка';
    throw new Error(`T-Bank Init failed (${data.ErrorCode || 'unknown'}): ${reason}`);
  }

  return data;
}

export interface GetStateResponse {
  Success: boolean;
  ErrorCode?: string;
  Message?: string;
  Details?: string;
  Status: 'NEW' | 'FORMSHOWED' | 'AUTHORIZING' | 'AUTHORIZED' | 'CONFIRMING' | 'CONFIRMED' | 'REJECTED' | 'CANCELED' | 'DEADLINE_EXPIRED' | string;
  PaymentId: string | number;
  OrderId?: string;
  Amount?: number;
}

export async function getTBankState(paymentId: string | number): Promise<GetStateResponse> {
  if (!TERMINAL_KEY || !TERMINAL_PASSWORD) {
    throw new Error('T-Bank credentials are not configured');
  }

  const payload: Record<string, any> = {
    TerminalKey: TERMINAL_KEY,
    PaymentId: String(paymentId),
  };

  payload.Token = generateTBankToken(payload, TERMINAL_PASSWORD);

  const res = await fetch(`${API_BASE_URL}/GetState`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await readTBankJson(res);
  return data;
}
