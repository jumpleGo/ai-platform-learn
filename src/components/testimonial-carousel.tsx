'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ReviewQuote } from '@/lib/reviews';

// Лента отзывов: горизонтальный скролл со снапом. Следующая карточка видна краем —
// это и есть подсказка, что ленту можно листать; стрелки и счётчик дублируют её явно.
export function TestimonialCarousel({ quotes }: { quotes: readonly ReviewQuote[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [active, setActive] = useState(0);

  // Края и текущая карточка считаются от фактического скролла: снап может
  // сработать и от свайпа, и от клавиш, и от стрелок — источник один.
  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= max - 4);
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    const step = card.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0');
    setActive(Math.min(quotes.length - 1, Math.max(0, Math.round(el.scrollLeft / step))));
  }, [quotes.length]);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      el.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [sync]);

  function scrollToCard(index: number) {
    const el = trackRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  }

  function step(dir: 1 | -1) {
    scrollToCard(Math.min(quotes.length - 1, Math.max(0, active + dir)));
  }

  return (
    <div className="mt-7">
      <div className="relative">
        <div
          ref={trackRef}
          tabIndex={0}
          role="group"
          aria-label="Отзывы учеников, листается вправо и влево"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
          }}
          className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 py-3 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy"
        >
          {quotes.map((quote, index) => (
            <blockquote
              key={quote.text}
              aria-label={`Отзыв ${index + 1} из ${quotes.length}`}
              className={`relative flex w-[78%] shrink-0 snap-start flex-col rounded-2xl border-2 border-brand-navy bg-card px-5 pb-5 pt-10 text-lg font-bold leading-relaxed text-brand-navy shadow-[0_4px_0_0_rgba(16,38,71,0.14)] sm:w-[46%] sm:text-xl lg:w-[31%] ${index % 2 === 0 ? 'sm:-rotate-1' : 'sm:rotate-1'}`}
            >
              <span className="absolute left-5 top-3 font-marker text-5xl leading-none text-brand-red" aria-hidden>“</span>
              <span className="flex-1">«{quote.text}»</span>
              {quote.author && (
                <footer className="mt-4 border-t border-brand-navy/15 pt-3 font-mono text-xs font-medium text-brand-navy/70">
                  {quote.author}{quote.role ? `, ${quote.role}` : ''}
                </footer>
              )}
            </blockquote>
          ))}
        </div>

        {/* Подсказка о продолжении ленты только на широких экранах: на мобилке
            торчащей карточки достаточно, а градиент читается как затемнение */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 -left-1 hidden w-8 bg-gradient-to-r from-brand-yellow to-transparent transition-opacity duration-300 sm:block ${atStart ? 'opacity-0' : 'opacity-100'}`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 -right-1 hidden w-8 bg-gradient-to-l from-brand-yellow to-transparent transition-opacity duration-300 sm:block ${atEnd ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CarouselArrow dir="prev" disabled={atStart} onClick={() => step(-1)} />
          <CarouselArrow dir="next" disabled={atEnd} onClick={() => step(1)} />
          <span className="ml-1 whitespace-nowrap font-mono text-sm font-bold tabular-nums text-brand-navy/70">
            {active + 1} / {quotes.length}
          </span>
        </div>

        {/* На узком экране одиннадцать точек не помещаются — там полоса прогресса */}
        <div aria-hidden className="h-2 w-24 overflow-hidden rounded-full bg-brand-navy/20 sm:hidden">
          <span
            className="block h-full rounded-full bg-brand-navy transition-all duration-200"
            style={{ width: `${((active + 1) / quotes.length) * 100}%` }}
          />
        </div>

        {/* Точки: и индикатор позиции, и способ перейти к нужному отзыву */}
        <div className="hidden items-center gap-1 sm:flex">
          {quotes.map((quote, index) => (
            <button
              key={quote.text}
              type="button"
              onClick={() => scrollToCard(index)}
              aria-label={`Отзыв ${index + 1}`}
              aria-current={index === active}
              className="flex h-11 w-4 items-center justify-center"
            >
              <span
                className={`block h-2 rounded-full transition-all duration-200 ${index === active ? 'w-5 bg-brand-navy' : 'w-2 bg-brand-navy/30'}`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CarouselArrow({ dir, disabled, onClick }: {
  dir: 'prev' | 'next'; disabled: boolean; onClick: () => void;
}) {
  const Icon = dir === 'prev' ? ArrowLeft : ArrowRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Предыдущий отзыв' : 'Следующий отзыв'}
      className="flex size-11 items-center justify-center rounded-xl border-2 border-brand-navy bg-card text-brand-navy shadow-[0_3px_0_0_rgba(16,38,71,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_rgba(16,38,71,0.2)] active:translate-y-0 active:shadow-[0_2px_0_0_rgba(16,38,71,0.2)] disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none motion-reduce:hover:translate-y-0"
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
