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
  const [hasSupport, setHasSupport] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [telegram, setTelegram] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
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
      setHasSupport(Boolean(data.hasSupport));
      setStartDate(data.startDate ?? null);
      setTelegram(data.telegram ?? null);
      setEmail(data.email ?? null);

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
  const loginHref = email ? `/login?email=${encodeURIComponent(email)}` : '/login';

  return (
    <section className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center py-10 px-4">
      <div className="w-full rounded-3xl border-2 border-brand-navy/15 bg-card p-7 text-center shadow-[0_6px_0_0_rgba(16,38,71,0.08)] sm:p-10">
        {state === 'confirmed' ? (
          hasSupport ? (
            <>
              <div className="mx-auto size-16 text-4xl flex items-center justify-center rounded-2xl bg-amber-100 border-2 border-brand-navy">
                🍦
              </div>
              <h1 className="mt-5 text-2xl sm:text-3xl font-heading font-extrabold text-brand-navy">
                Вы записаны на поток!
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-brand-charcoal/80 text-pretty">
                Оплата прошла успешно. Доступ откроется в день старта программы (<strong>{startDate || '14 сентября'}</strong>). Перед стартом мы свяжемся с вами в Telegram и добавим в закрытый чат потока.
              </p>

              <div className="my-6 rounded-2xl border-2 border-brand-navy/10 bg-brand-cream/60 p-4 text-left text-sm space-y-2 font-medium">
                <div className="flex justify-between items-center text-brand-navy">
                  <span className="text-brand-charcoal/60">Старт потока:</span>
                  <span className="font-extrabold text-brand-red">{startDate || '14 сентября'}</span>
                </div>
                {telegram && (
                  <div className="flex justify-between items-center text-brand-navy">
                    <span className="text-brand-charcoal/60">Ваш Telegram:</span>
                    <span className="font-bold">{telegram}</span>
                  </div>
                )}
                {email && (
                  <div className="flex justify-between items-center text-brand-navy">
                    <span className="text-brand-charcoal/60">Email:</span>
                    <span className="font-mono text-xs">{email}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="https://t.me/gelato_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants(), 'rounded-xl h-12 text-sm font-bold bg-brand-navy hover:bg-brand-navy/90 text-brand-cream')}
                >
                  Написать в Telegram @gelato_ai
                </a>
                <Link
                  href={courseHref}
                  className={cn(buttonVariants({ variant: 'outline' }), 'rounded-xl h-12 text-sm font-bold border-2 border-brand-navy/20')}
                >
                  Программа курса
                </Link>
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto size-14 text-emerald-500" aria-hidden />
              <h1 className="mt-5 text-2xl sm:text-3xl font-heading font-extrabold text-brand-navy">
                Оплата прошла, доступ открыт!
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-brand-charcoal/80 text-pretty">
                Мы открыли доступ к материалам и отправили вам на почту {email ? <strong>{email}</strong> : 'указанную при оплате'} данные для входа (логин и пароль).
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={loginHref} className={cn(buttonVariants(), 'rounded-xl h-12 text-sm font-bold bg-brand-navy hover:bg-brand-navy/90 text-brand-cream')}>
                  Войти и начать обучение →
                </Link>
              </div>
            </>
          )
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
                : 'Обычно это занимает несколько секунд. Не закрывайте страницу — статус обновится автоматически.'}
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
