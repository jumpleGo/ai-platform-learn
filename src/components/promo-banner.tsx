'use client';
import { ArrowUpRight } from 'lucide-react';
import { DoodleScatter, DoodleWord } from '@/components/doodle-decor';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';

// Маркетинговые баннеры для пользователей без подписки. Ведут на внешний лендинг оплаты.
const PROMO_URL = 'https://start.gelato.su';
const PROMO_HOST = 'start.gelato.su';

// Кнопка-ссылка на лендинг: подчёркнута маркерным росчерком, клик уходит в воронку
function PromoCta({
  place,
  label,
  className = '',
}: {
  place: string;
  label: string;
  className?: string;
}) {
  return (
    <span className={`relative inline-block ${className}`}>
      <a
        href={PROMO_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track(EVENTS.subscribeClicked, { place })}
        className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
      >
        {label}
        <ArrowUpRight className="size-4" aria-hidden />
      </a>
      <DoodleScatter
        glyph="scribble"
        color="oklch(0.78 0.16 85)"
        className="-bottom-2 left-1 h-2.5 w-[calc(100%-0.5rem)] opacity-90"
      />
    </span>
  );
}

// Крупный баннер в конце главной — основной оффер со всеми граффити-акцентами
export function PromoBanner() {
  return (
    <section className="animate-rise relative" style={{ '--rise-delay': '0.16s' } as React.CSSProperties}>
      <DoodleWord
        text="без лимитов"
        color="oklch(0.68 0.19 12)"
        className="z-10 -top-4 left-4 text-xl -rotate-6 sm:-top-6 sm:left-8 sm:text-2xl"
      />
      <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-primary/30 bg-accent px-6 py-10 sm:px-12 sm:py-12">
        <div className="bg-hero-glow pointer-events-none absolute -inset-x-10 -bottom-20 h-56 rotate-180 opacity-70" aria-hidden />
        <DoodleScatter
          glyph="icecream"
          color="oklch(0.72 0.19 5)"
          className="top-4 right-5 h-14 w-11 rotate-12 opacity-90 sm:top-6 sm:right-10 sm:h-20 sm:w-16"
        />
        <DoodleScatter
          glyph="starburst"
          color="oklch(0.78 0.16 85)"
          className="top-3 right-20 h-7 w-7 -rotate-12 opacity-80 sm:right-32 sm:h-10 sm:w-10"
        />
        <DoodleScatter
          glyph="sparkleheart"
          color="oklch(0.68 0.19 12)"
          className="bottom-5 right-6 h-8 w-9 -rotate-6 opacity-60 sm:bottom-8 sm:right-14 sm:h-11 sm:w-12"
        />
        <DoodleScatter
          glyph="mandala"
          color="oklch(0.7 0.16 160)"
          className="top-1/2 right-8 hidden h-10 w-10 -translate-y-1/2 rotate-6 opacity-45 sm:block sm:right-24"
        />
        <div className="relative max-w-xl space-y-4">
          <p className="font-mono text-sm text-accent-foreground">$ подписка</p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Все уроки открываются одной подпиской
          </h2>
          <p className="leading-relaxed text-muted-foreground text-pretty">
            Полный доступ ко&nbsp;всем курсам GELATO: видео, конспекты и&nbsp;материалы уроков.
            Новые курсы открываются сразу, как только выходят.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-3">
            <PromoCta place="promo_home" label="Оформить подписку" />
            <span className="font-mono text-xs text-muted-foreground">{PROMO_HOST}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// Баннер внутри урока — показывается вместо доступа к закрытому видео
export function PromoLessonBanner() {
  return (
    <div className="animate-rise relative mt-2 rounded-2xl border-2 border-dashed border-primary/30 bg-accent px-5 py-6 sm:px-7">
      <DoodleWord
        text="открой"
        color="oklch(0.7 0.14 240)"
        className="z-10 -top-3.5 left-4 text-lg -rotate-6 sm:text-xl"
      />
      <DoodleScatter
        glyph="starburst"
        color="oklch(0.78 0.16 85)"
        className="top-3 right-4 h-7 w-7 rotate-12 opacity-70 sm:h-9 sm:w-9"
      />
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 max-w-sm space-y-1.5">
          <p className="font-medium">Урок открывается подпиской</p>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Видео и&nbsp;полные материалы доступны по&nbsp;подписке. Оформление занимает пару
            минут на&nbsp;{PROMO_HOST}
          </p>
        </div>
        <div className="relative flex items-center gap-3">
          <DoodleScatter
            glyph="arrow"
            color="oklch(0.68 0.19 12)"
            className="-top-7 -left-2 hidden h-6 w-11 -rotate-6 opacity-80 sm:block"
          />
          <PromoCta place="promo_lesson" label="Получить доступ" />
        </div>
      </div>
    </div>
  );
}
