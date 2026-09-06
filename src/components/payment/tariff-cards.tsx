'use client';

import { useEffect, useRef } from 'react';
import { Check, Clock, Gift, X } from 'lucide-react';
import { getTariffsForCourse } from '@/lib/payments/tariffs';
import { useVibePriceTimer } from '@/lib/payments/vibe-timer-client';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';
import { CourseBuyButton } from '@/components/payment/course-buy-button';

// Тарифы прямо на лендинге: цена, состав и подарок видны до открытия модалки.
// Исследование показало, что до блока форматов доходят, а решение принять не могут —
// данных для решения на странице не было.
export function TariffCards({
  courseSlug,
  courseTitle,
  // Общие условия под карточками: срок доступа, подписки и т.п.
  footnote,
}: {
  courseSlug: string;
  courseTitle: string;
  footnote?: string;
}) {
  const tariffs = getTariffsForCourse(courseSlug);
  const timer = useVibePriceTimer();
  const rootRef = useRef<HTMLDivElement>(null);

  // Показ цены — отдельное событие воронки: клики по кнопкам его не заменяют
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          track(EVENTS.pricingViewed, { courseSlug, place: 'course_landing_pricing' });
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [courseSlug]);

  return (
    <div ref={rootRef} className="space-y-4">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {tariffs.map((t) => {
          const isHero = Boolean(t.popular);
          const showTimer = t.specialOffer && timer.mounted;
          return (
            <div key={t.id} className="relative">
              <div
                className={`relative flex h-full flex-col overflow-hidden rounded-3xl border-2 p-6 sm:p-7 transition-all hover:-translate-y-0.5 ${
                  isHero
                    ? 'border-brand-navy bg-brand-yellow/30 shadow-[0_6px_0_0_rgba(16,38,71,0.12)] hover:shadow-[0_8px_0_0_rgba(16,38,71,0.18)]'
                    : 'border-brand-navy/15 bg-card shadow-[0_4px_0_0_rgba(16,38,71,0.06)] hover:border-brand-navy hover:shadow-[0_6px_0_0_rgba(16,38,71,0.12)]'
                }`}
              >
                {isHero && (
                  // Фирменная полоска сверху, как у выделенных карточек в других блоках
                  <div
                    className="absolute top-0 left-0 right-0 h-3.5 border-b-2 border-brand-navy/25"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(90deg, #1F6E43 0px, #1F6E43 16px, #EDF6F0 16px, #EDF6F0 32px)',
                    }}
                  />
                )}

                <div className={isHero ? 'pt-3' : ''}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-brand-navy/10 pb-4">
                    <h3 className="font-heading text-xl sm:text-2xl font-black text-brand-navy leading-tight">
                      {t.title}
                    </h3>
                    {isHero ? (
                      <span className="rounded-md border border-brand-forest/25 bg-brand-forest/15 px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-wider text-brand-forest">
                        выбор большинства
                      </span>
                    ) : (
                      <span className="rounded-md border border-brand-navy/15 bg-brand-cream/80 px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-wider text-brand-navy/70">
                        минимальный путь
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-heading text-4xl sm:text-5xl font-black tracking-tight text-brand-navy tabular-nums">
                      {t.price.toLocaleString('ru-RU')} ₽
                    </span>
                    {t.oldPrice && (
                      <span className="text-lg font-bold text-brand-charcoal/45 line-through tabular-nums">
                        {t.oldPrice.toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[15px] font-medium text-brand-charcoal/75 text-pretty">{t.description}</p>

                  {/* Таймер стоит только рядом с ценой, к которой относится */}
                  {showTimer && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-brand-navy/20 bg-brand-cream px-3 py-1.5">
                      <Clock className="size-3.5 text-brand-red" aria-hidden />
                      <span className="font-heading text-xs font-black text-brand-navy">
                        Спеццена ещё{' '}
                        <span className="ml-0.5 rounded-md border border-brand-red/20 bg-brand-red/10 px-1.5 py-0.5 font-mono text-xs font-black text-brand-red tabular-nums">
                          {timer.formattedTime}
                        </span>
                      </span>
                    </div>
                  )}

                  <ul className="mt-5 space-y-2.5 text-base font-medium leading-snug text-brand-charcoal/90 sm:text-[17px]">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 size-4 shrink-0 text-brand-forest" aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                    {t.excludedFeatures?.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-brand-charcoal/60">
                        <X className="mt-0.5 size-4 shrink-0 text-brand-red/70" aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {t.specialOffer && (
                    <div className="mt-5 -rotate-[0.45deg] border-2 border-dashed border-brand-navy bg-brand-yellow px-3 py-2 shadow-[3px_3px_0_0_var(--color-brand-red)]">
                      <p className="flex items-start gap-2 text-sm leading-snug text-brand-navy">
                        <Gift className="mt-0.5 size-4 shrink-0 text-brand-red" aria-hidden />
                        <span>
                          <span className="font-extrabold">{t.specialOffer.title}.</span>{' '}
                          <span className="font-medium text-brand-navy/80">{t.specialOffer.note}</span>
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Кнопки обеих карточек на одной линии, даже если состав разной длины */}
                <div className="mt-auto pt-7">
                  <CourseBuyButton
                    courseSlug={courseSlug}
                    courseTitle={courseTitle}
                    tariffId={t.id}
                    place="course_landing_pricing"
                    label={`Оформить за ${t.price.toLocaleString('ru-RU')} ₽`}
                    className={`inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-brand-navy px-6 text-[15px] font-extrabold tracking-tight text-brand-navy transition-all duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${
                      isHero
                        ? 'btn-scarf shadow-[0_3px_0_0_var(--color-scarf-green)] hover:shadow-[0_5px_0_0_var(--color-scarf-green)]'
                        : 'bg-card shadow-[0_3px_0_0_rgba(16,38,71,0.25)] hover:shadow-[0_5px_0_0_rgba(16,38,71,0.35)]'
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {footnote && (
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{footnote}</p>
      )}
    </div>
  );
}
