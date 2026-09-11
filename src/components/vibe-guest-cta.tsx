'use client';

import Link from 'next/link';
import { ArrowDown, ArrowRight, Send } from 'lucide-react';
import { TELEGRAM_DM } from '@/lib/site';
import { useExperiment } from '@/lib/experiments-client';

// Кнопки героя лендинга вибкода для гостя. A/B: control — как сейчас («К тарифам» +
// «Личка»), free_lesson — перед ними первичная кнопка в бесплатный урок. Разница
// ровно одна: добавленная кнопка, остальные не трогаем.
export function VibeGuestCta() {
  const variant = useExperiment('vibe_landing_free_cta', true);
  // Вариант ещё не разыгран — ничего не рисуем, чтобы не мигал контроль
  if (!variant) return null;

  return (
    <>
      {variant === 'free_lesson' && (
        <Link
          href="/courses/claude-code/lessons/1"
          className="btn-goose inline-flex h-12 items-center gap-2 rounded-xl border-2 border-brand-navy px-6 text-base font-extrabold tracking-tight text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_var(--color-goose-red)] motion-reduce:hover:translate-y-0"
        >
          Смотреть бесплатный урок
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
      <a
        href="#pricing"
        className="inline-flex h-12 items-center gap-1.5 rounded-xl border-2 border-brand-navy/25 bg-brand-cream/80 px-5 text-[15px] font-bold text-brand-navy transition-colors hover:border-brand-navy/60"
      >
        К тарифам
        <ArrowDown className="size-4" aria-hidden />
      </a>
      <a
        href={TELEGRAM_DM}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-12 items-center gap-2 rounded-xl border-2 border-brand-navy/20 bg-card/60 px-5 text-[15px] font-bold text-brand-navy transition-colors hover:border-brand-navy/60"
      >
        <Send className="size-4" />
        Личка
      </a>
    </>
  );
}
