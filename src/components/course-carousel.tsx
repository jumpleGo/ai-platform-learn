'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LessonCard, type LessonCardData } from './lesson-card';
import { Badge } from '@/components/ui/badge';
import { plural } from '@/lib/utils';

export function CourseCarousel({ course, lessons, lockedIds }: {
  // только нужные поля курса — полный объект (с уроками) в клиент не уходит
  course: {
    title: string;
    description: string;
    isTest: boolean;
    testToastMessage: string | null;
    showBadge: boolean;
    badgeText: string | null;
    highlightBackground: boolean;
  };
  lessons: LessonCardData[];
  lockedIds: string[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // следим за краями, чтобы гасить стрелки и боковые градиенты
  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= max - 4);
  }, []);

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

  function scrollByPage(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: reduce ? 'auto' : 'smooth' });
  }

  const showArrows = lessons.length > 1;

  return (
    <section className="relative space-y-5">
      {course.highlightBackground && (
        <div
          aria-hidden
          className="bg-hero-glow pointer-events-none absolute inset-y-0 -top-6 -bottom-6 left-1/2 w-screen -translate-x-1/2 rounded-3xl bg-accent/70"
        />
      )}
      <div className="relative flex items-end justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">{course.title}</h2>
            {course.showBadge && course.badgeText && (
              <Badge variant="default">{course.badgeText}</Badge>
            )}
          </div>
          {course.description && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{course.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 pb-1">
          <span className="font-mono text-xs text-muted-foreground">
            {lessons.length} {plural(lessons.length, ['урок', 'урока', 'уроков'])}
          </span>
          {showArrows && (
            <div className="hidden items-center gap-1.5 sm:flex">
              <CarouselButton dir="prev" disabled={atStart} onClick={() => scrollByPage(-1)} />
              <CarouselButton dir="next" disabled={atEnd} onClick={() => scrollByPage(1)} />
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <div
          ref={trackRef}
          className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-3"
        >
          {lessons.map((l, i) => (
            <LessonCard
              key={l.id}
              lesson={l}
              index={i}
              locked={lockedIds.includes(l.id)}
              isTest={course.isTest}
              testToastMessage={course.testToastMessage}
            />
          ))}
        </div>
        {/* боковые градиенты-подсказки, что лента продолжается */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 -left-1 w-10 bg-gradient-to-r from-background to-transparent transition-opacity duration-300 ${atStart ? 'opacity-0' : 'opacity-100'}`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 -right-1 w-10 bg-gradient-to-l from-background to-transparent transition-opacity duration-300 ${atEnd ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>
    </section>
  );
}

function CarouselButton({ dir, disabled, onClick }: {
  dir: 'prev' | 'next'; disabled: boolean; onClick: () => void;
}) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Назад' : 'Вперёд'}
      className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all duration-200 hover:border-primary/40 hover:text-foreground active:translate-y-px disabled:pointer-events-none disabled:opacity-0"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
