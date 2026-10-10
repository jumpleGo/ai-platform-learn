import type { ComponentType } from 'react';
import {
  ArrowDown, ArrowRight, BookOpen, GitCommitHorizontal, PlayCircle, ShieldCheck, Terminal, type LucideProps,
} from 'lucide-react';
import { StickerTag } from '@/components/accent';
import { FreeLessonCta } from '@/components/free-lesson-cta';
import { PROGRAM_URL } from '@/lib/free-lessons';
import { getCourseLanding } from '@/lib/course-landings';
import { getTariffsForCourse } from '@/lib/payments/tariffs';
import { nbsp } from '@/lib/typography';

// Иконки для следующих модулей программы — по порядку в VIBECODING.program (без первого модуля запуска)
const STEP_ICONS: readonly ComponentType<LucideProps>[] = [BookOpen, ShieldCheck, Terminal, GitCommitHorizontal];

// Сколько модулей показываем схемой: три следующих темы, дальше — ссылка на программу
const NEXT_STEPS = 3;

// Блок «что дальше в курсе» под плеером бесплатного урока (вариант next_step теста
// lesson_next_step). Открытый урок — не тупик, а ступень программы: показываем, где
// человек находится, какие темы идут дальше, и ведём на страницу курса, а не на тарифы,
// где он уже был.
export function FreeLessonNextStep({ lessonNumber, lessonId }: { lessonNumber: number; lessonId: string }) {
  const landing = getCourseLanding('vibecoding');
  const total = landing?.facts.find((f) => f.label.includes('уроков'))?.value ?? '17';
  // Первый модуль — запуск на проекте, он предшествует открытым урокам; дальше идут темы «что дальше»
  const steps = landing?.program.slice(1, 1 + NEXT_STEPS) ?? [];
  const minPrice = Math.min(...getTariffsForCourse('vibecoding').map((t) => t.price));

  return (
    <section
      aria-labelledby="lesson-next-step"
      className="rounded-2xl border-2 border-brand-navy bg-brand-yellow/35 p-5 shadow-[0_4px_0_0_rgba(16,38,71,0.1)] sm:p-7"
    >
      <StickerTag tone="navy" className="text-xs sm:text-sm">{nbsp('бесплатный урок')}</StickerTag>
      <h2 id="lesson-next-step" className="mt-3 font-heading text-xl font-extrabold tracking-tight text-balance text-brand-navy sm:text-2xl">
        {nbsp(`Это открытый урок. В курсе «Инженерный вайбкодинг» — ${total} уроков, вот что в нём дальше:`)}
      </h2>

      {/* Схема: текущий урок → следующие модули. На телефоне — столбиком со стрелками вниз */}
      <ol className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
        <li className="flex items-center gap-3 rounded-xl border-2 border-brand-navy bg-brand-navy p-3 text-brand-cream sm:flex-1 sm:flex-col sm:items-start sm:gap-2 sm:p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-brand-navy">
            <PlayCircle className="size-5" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-mono text-[11px] font-bold tracking-wider uppercase opacity-70">вы здесь</span>
            <span className="block text-sm font-extrabold leading-snug">{nbsp('Этот открытый урок')}</span>
          </span>
        </li>
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[i] ?? BookOpen;
          return (
            <li key={step.title} className="contents">
              <span className="flex justify-center text-brand-navy/50 sm:items-center sm:px-1" aria-hidden>
                <ArrowDown className="size-4 sm:hidden" strokeWidth={2.5} />
                <ArrowRight className="hidden size-4 sm:block" strokeWidth={2.5} />
              </span>
              <div className="flex items-center gap-3 rounded-xl border-2 border-brand-navy/15 bg-card p-3 sm:flex-1 sm:flex-col sm:items-start sm:gap-2 sm:p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-sky text-brand-navy">
                  <Icon className="size-5" strokeWidth={2.25} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-[11px] font-bold tracking-wider text-brand-navy/55 uppercase">
                    модуль {i + 2}
                  </span>
                  <span className="block text-sm font-extrabold leading-snug text-brand-navy text-pretty">{nbsp(step.title)}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FreeLessonCta
          href={PROGRAM_URL}
          label="Подробнее о курсе"
          lessonId={lessonId}
          position="next_step"
          className="w-full sm:w-auto"
        />
        <p className="text-sm font-bold text-brand-navy/80">
          {nbsp(`${total} уроков · от ${minPrice.toLocaleString('ru-RU')} ₽`)}
        </p>
      </div>
    </section>
  );
}
