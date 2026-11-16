import Link from 'next/link';
import { ArrowUpRight, NotebookPen } from 'lucide-react';
import { standaloneFreeLessonPath, type StandaloneFreeLesson } from '@/lib/free-lessons';

// Короткие подписи только для витрины; заголовки и тексты самих уроков не меняем.
const PREVIEWS: Record<string, { title: string; teaser: string }> = {
  'gstack-praktikum': {
    title: 'Проект с gstack',
    teaser: 'Соберите список покупок с ИИ.',
  },
  'proverka-otvetov-ii': {
    title: 'Проверьте ответ ИИ',
    teaser: 'Найдите ошибки и пропуски.',
  },
  'kak-ustroen-ii-agent': {
    title: 'Как устроен ИИ-агент',
    teaser: 'Разберите, кто решает и делает.',
  },
  'sam-i-ii': {
    title: 'Сами или с ИИ?',
    teaser: 'Сравните время и качество.',
  },
  'chto-umeet-ii': {
    title: 'Что умеет ИИ',
    teaser: 'Отделите факты от прогнозов.',
  },
  'doverie-k-ii': {
    title: 'Можно ли доверять ИИ?',
    teaser: 'Проверьте помощника до установки.',
  },
  'kak-sdelan-rolik': {
    title: 'Как сделан ролик',
    teaser: 'Сравните съёмку, ИИ и графику.',
  },
};

const TONES = ['bg-brand-yellow/25', 'bg-brand-sky/25', 'bg-brand-green/10'] as const;

export function PracticumCard({ lesson, index = 0 }: {
  lesson: StandaloneFreeLesson;
  index?: number;
}) {
  const preview = PREVIEWS[lesson.slug] ?? { title: lesson.h1, teaser: lesson.lead };

  return (
    <Link
      href={standaloneFreeLessonPath(lesson.slug)}
      aria-label={`Открыть практикум «${lesson.h1}»`}
      className={`group flex h-full min-w-0 flex-col rounded-2xl border border-brand-navy/15 p-3 text-brand-navy transition-colors hover:border-brand-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy sm:p-4 ${TONES[index % TONES.length]}`}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-brand-charcoal/80">
        <NotebookPen className="size-4 shrink-0" aria-hidden />
        Практикум
        <ArrowUpRight className="ml-auto size-4 shrink-0" aria-hidden />
      </span>
      <h3 className="mt-3 line-clamp-2 min-h-[2.5em] font-heading text-base leading-tight font-extrabold sm:text-lg">
        {preview.title}
      </h3>
      <p className="mt-2 truncate text-xs text-brand-charcoal/85 sm:text-sm">{preview.teaser}</p>
    </Link>
  );
}
