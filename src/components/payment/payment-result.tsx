'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleX, LoaderCircle, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewState = 'checking' | 'confirmed' | 'pending' | 'failed' | 'error';

const FINAL_FAILURES = new Set(['REJECTED', 'CANCELED', 'DEADLINE_EXPIRED']);

export function PaymentResult({
  initialResult,
  orderId,
}: {
  initialResult?: string;
  orderId?: string;
}) {
  const [state, setState] = useState<ViewState>('checking');
  const [courseSlug, setCourseSlug] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const checkPayment = useCallback(async () => {
    if (!orderId) {
      setState(initialResult === 'failed' ? 'failed' : 'error');
      return true;
    }

    try {
      const response = await fetch('/api/payments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось проверить платёж');

      setCourseSlug(data.courseSlug ?? null);
      if (data.confirmed && data.status === 'CONFIRMED') {
        setState('confirmed');
        return true;
      }
      if (FINAL_FAILURES.has(data.status)) {
        setState('failed');
        return true;
      }
      if (initialResult === 'failed') {
        setState('failed');
        return true;
      }
      setState('pending');
      return false;
    } catch {
      setState('error');
      return true;
    }
  }, [initialResult, orderId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let checks = 0;

    const poll = async () => {
      const finished = await checkPayment();
      checks += 1;
      if (!cancelled && !finished && checks < 15) {
        timer = setTimeout(poll, 2000);
      }
    };
    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attempt, checkPayment, initialResult]);

  const retry = () => {
    setState('checking');
    setAttempt((value) => value + 1);
  };

  const courseHref = courseSlug ? `/courses/${courseSlug}` : '/courses';

  return (
    <section className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center py-10">
      <div className="w-full rounded-3xl border border-border bg-card p-7 text-center shadow-sm sm:p-10">
        {state === 'confirmed' ? (
          <>
            <CheckCircle2 className="mx-auto size-14 text-emerald-500" aria-hidden />
            <h1 className="mt-5 text-3xl font-bold text-brand-navy">Оплата прошла</h1>
            <p className="mt-3 text-muted-foreground">
              Мы подтвердили платёж и открыли доступ. Если вы ещё не зарегистрированы, используйте тот же email, который указали при оплате.
            </p>
            <Link href={courseHref} className={cn(buttonVariants(), 'mt-7')}>
              Перейти к обучению
            </Link>
          </>
        ) : state === 'failed' ? (
          <>
            <CircleX className="mx-auto size-14 text-destructive" aria-hidden />
            <h1 className="mt-5 text-3xl font-bold text-brand-navy">Платёж не завершён</h1>
            <p className="mt-3 text-muted-foreground">
              Банк не подтвердил оплату. Вернитесь к тарифу и попробуйте ещё раз или выберите другой способ оплаты.
            </p>
            <Link href={courseHref} className={cn(buttonVariants(), 'mt-7')}>
              Вернуться к тарифам
            </Link>
          </>
        ) : (
          <>
            <LoaderCircle className="mx-auto size-14 animate-spin text-primary" aria-hidden />
            <h1 className="mt-5 text-3xl font-bold text-brand-navy">
              {state === 'error' ? 'Не удалось проверить платёж' : 'Подтверждаем оплату'}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {state === 'error'
                ? 'Платёж мог пройти, но сейчас мы не получили его статус. Попробуйте проверить ещё раз.'
                : 'Обычно это занимает несколько секунд. Не закрывайте страницу — доступ откроется автоматически.'}
            </p>
            {state === 'error' || state === 'pending' ? (
              <Button type="button" variant="outline" className="mt-7" onClick={retry}>
                <RefreshCw aria-hidden />
                Проверить ещё раз
              </Button>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
