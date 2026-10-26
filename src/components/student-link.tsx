'use client';
import Link from 'next/link';
import { EVENTS } from '@/lib/analytics/events';
import { goal } from '@/app/student/student-install';
import { Lemon } from '@/components/scene/lemon';

// Лимонная пилюля на /student с первого экрана главной: из рилсов приходят
// по «ссылке в профиле» и должны найти набор сразу, без поиска по сайту
export function StudentLink({ place, className = '' }: { place: 'classic' | 'scene'; className?: string }) {
  return (
    <Link
      href="/student"
      onClick={() => goal(EVENTS.homeStudentClicked, { place })}
      className={`group inline-flex max-w-full items-center gap-[0.65em] rounded-full border-[2.5px] border-brand-navy bg-brand-yellow py-[0.4em] pr-[1.05em] pl-[0.4em] text-left text-[15px] text-brand-navy shadow-[0_4px_0_var(--color-brand-navy)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_0_var(--color-brand-navy)] active:translate-y-1 active:shadow-none focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand-sky motion-reduce:transition-none ${className}`}
    >
      <span className="grid size-[2.4em] shrink-0 place-items-center rounded-full border-2 border-brand-navy bg-brand-cream" aria-hidden>
        <Lemon className="h-auto w-[1.6em] transition-transform duration-200 group-hover:-rotate-12 motion-reduce:transition-none" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[0.8em] font-bold opacity-70">Бесплатно для учёбы</span>
        <span className="block font-extrabold text-balance">
          Gelato Student
          <span className="font-semibold max-[700px]:hidden"> — ИИшка подсказывает, а код пишешь ты</span>
          <span aria-hidden> →</span>
        </span>
      </span>
    </Link>
  );
}
