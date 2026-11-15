import type { Metadata } from 'next';
import { PaymentResult } from '@/components/payment/payment-result';

export const metadata: Metadata = {
  title: 'Результат оплаты — GELATO',
  robots: { index: false, follow: false },
};

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; orderId?: string }>;
}) {
  const { result, orderId } = await searchParams;

  return <PaymentResult initialResult={result} orderId={orderId} />;
}
