'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, FileText, Mail, Send } from 'lucide-react';
import { submitLeadAction } from '@/app/(app)/actions';
import { useExperiment } from '@/lib/experiments-client';
import { parseLeadContact } from '@/lib/leads';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';
import { nbsp } from '@/lib/typography';

const PLACE = 'course_landing_after_pricing';

// Мягкий шаг под тарифами для тех, кто не готов платить сейчас: оставить контакт
// и получить программу с примером домашки. Показывается только в варианте `form`
// теста lead_capture; контроль — ничего (текущее поведение: контакты не собираются).
export function LeadCapture({ courseSlug, fromLanding }: { courseSlug: string; fromLanding: string | null }) {
  // Экспозиция — когда место формы доскроллено, а не при загрузке: в контроле здесь пусто,
  // и считать нужно тех, кто это место реально увидел, в обоих вариантах одинаково
  const anchorRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = anchorRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setSeen(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const variant = useExperiment('lead_capture', seen);
  const [done, setDone] = useState<'telegram' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (variant !== 'form') return <div ref={anchorRef} aria-hidden />;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    // Та же проверка, что на сервере — чтобы подсказать до запроса
    if (!parseLeadContact(String(data.get('contact') ?? ''))) {
      setError('Напишите ник в Telegram (@username) или почту');
      return;
    }
    if (data.get('consent') !== 'on') {
      setError('Нужно согласие на обработку данных');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitLeadAction(data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(result.type);
      track(EVENTS.leadSubmitted, { courseSlug, place: PLACE, type: result.type });
    });
  }

  return (
    <div ref={anchorRef} className="relative mt-6 rounded-3xl border-2 border-dashed border-brand-navy/40 bg-brand-yellow/20 p-5 sm:p-7">
      {done ? (
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-brand-navy bg-brand-forest/20 text-brand-forest">
            <Check className="size-6" aria-hidden />
          </span>
          <div>
            <p className="font-heading text-xl font-black leading-tight text-balance text-brand-navy sm:text-2xl">
              Готово, контакт записал
            </p>
            <p className="mt-1.5 text-base font-medium leading-snug text-brand-charcoal/80 text-pretty sm:text-lg">
              {nbsp(done === 'telegram'
                ? 'Напишу в Telegram в течение дня: пришлю программу и пример домашнего задания.'
                : 'Отправлю на почту в течение дня: программу и пример домашнего задания.')}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_minmax(0,24rem)] md:items-center">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-brand-navy bg-card text-brand-navy shadow-[0_3px_0_0_rgba(16,38,71,0.2)]">
              <FileText className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-heading text-xl font-black leading-tight text-balance text-brand-navy sm:text-2xl">
                {nbsp('Не готовы решать сейчас?')}
              </p>
              <p className="mt-1.5 text-base font-medium leading-snug text-brand-charcoal/80 text-pretty sm:text-lg">
                {nbsp('Оставьте Telegram — пришлю программу курса и пример домашнего задания, чтобы посмотреть спокойно.')}
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
            <input type="hidden" name="courseSlug" value={courseSlug} />
            <input type="hidden" name="place" value={PLACE} />
            {fromLanding && <input type="hidden" name="fromLanding" value={fromLanding} />}
            {/* Honeypot: человек поле не видит, бот заполняет */}
            <div className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden>
              <label>
                Сайт
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Ник в Telegram или email</span>
                <Send className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-brand-navy/50" aria-hidden />
                <input
                  type="text"
                  name="contact"
                  inputMode="email"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={120}
                  placeholder="@username или email"
                  aria-invalid={error ? true : undefined}
                  onChange={() => error && setError(null)}
                  className={`h-12 w-full rounded-xl border-2 bg-card pl-10 pr-3 text-base font-semibold text-brand-navy placeholder:font-medium placeholder:text-brand-charcoal/45 focus:outline-none focus:ring-2 focus:ring-brand-navy/30 ${
                    error ? 'border-brand-red' : 'border-brand-navy/30 focus:border-brand-navy'
                  }`}
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="btn-scarf inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-brand-navy px-5 text-[15px] font-extrabold tracking-tight text-brand-navy shadow-[0_3px_0_0_var(--color-scarf-green)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_var(--color-scarf-green)] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:hover:translate-y-0"
              >
                {pending ? 'Отправляю…' : 'Получить'}
                {!pending && <ArrowRight className="size-4" aria-hidden />}
              </button>
            </div>

            {error && (
              <p role="alert" className="text-sm font-semibold leading-snug text-brand-red">{nbsp(error)}</p>
            )}

            <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-snug text-brand-charcoal/70">
              <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 accent-brand-navy" />
              <span>
                {nbsp('Согласен на обработку персональных данных по ')}
                <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-brand-navy">политике конфиденциальности</Link>
              </span>
            </label>
            <p className="flex items-center gap-1.5 text-xs font-medium text-brand-charcoal/60">
              <Mail className="size-3.5 shrink-0" aria-hidden />
              {nbsp('Одно сообщение, без рассылок.')}
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
