import { ArrowUpRight, Check, GitCommitHorizontal } from 'lucide-react';
import type { CourseLanding } from '@/lib/course-landings';
import { LandingIcon } from '@/components/landing-icon';

type CaseStudy = NonNullable<CourseLanding['caseStudy']>;

// Реальный цикл работы схемой-конвейером: пять шагов с иконками, мини-дифф,
// плашки автопроверок и шкала времени. Читается за секунды, детали — мелким.
export function CaseCycle({ data }: { data: CaseStudy }) {
  const total = data.diff.added + data.diff.removed;
  // мини-дифф: десять клеток пропорционально добавленным и удалённым строкам
  const addedCells = Math.max(1, Math.round((data.diff.added / total) * 10));

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-brand-navy bg-card shadow-[0_6px_0_0_rgba(16,38,71,0.12)]">
      {/* Шапка: тёмная, чтобы блок читался как отдельный экспонат, а не ещё одна карточка */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-navy px-5 py-4 text-brand-cream sm:px-7">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-cream/10">
            <GitCommitHorizontal className="size-5" aria-hidden />
          </span>
          <h3 className="font-heading text-lg font-black leading-tight sm:text-xl">{data.title}</h3>
        </div>
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-brand-cream/70">{data.source}</span>
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-8">
        {/* Конвейер: на десктопе пять колонок с линией, на мобильном вертикальная лента */}
        <ol className="relative grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-4">
          <span className="absolute top-7 right-[10%] left-[10%] hidden h-0.5 bg-brand-navy/15 lg:block" aria-hidden />
          {data.steps.map((step, i) => {
            const isLast = i === data.steps.length - 1;
            const isDiff = step.icon === 'diff';
            const isChecks = step.icon === 'shield';
            return (
              <li key={step.label} className="relative flex gap-4 lg:flex-col lg:items-center lg:gap-0 lg:text-center">
                {!isLast && (
                  <span className="absolute top-14 bottom-[-1.5rem] left-7 w-0.5 bg-brand-navy/15 lg:hidden" aria-hidden />
                )}
                <span className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-brand-navy bg-brand-cream text-brand-navy shadow-[0_3px_0_0_rgba(16,38,71,0.15)]">
                  <LandingIcon name={step.icon} className="size-6" />
                  <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border-2 border-brand-navy bg-brand-yellow font-marker text-xs leading-none text-brand-navy">
                    {i + 1}
                  </span>
                </span>
                <div className="min-w-0 pt-1 lg:pt-3">
                  <p className="font-mono text-[11px] font-black uppercase tracking-wider text-brand-navy/55">{step.label}</p>
                  <p className="mt-0.5 font-heading text-[17px] font-black leading-tight text-brand-navy text-balance sm:text-lg">{step.short}</p>

                  {isDiff && (
                    <div className="mt-2 flex items-center gap-2 font-mono text-xs font-black lg:justify-center">
                      <span className="text-brand-forest">+{data.diff.added}</span>
                      <span className="flex gap-0.5" aria-hidden>
                        {Array.from({ length: 10 }, (_, k) => (
                          <span key={k} className={`h-3 w-2 rounded-[2px] ${k < addedCells ? 'bg-brand-forest' : 'bg-brand-red/80'}`} />
                        ))}
                      </span>
                      <span className="text-brand-red">−{data.diff.removed}</span>
                    </div>
                  )}

                  {isChecks && (
                    <div className="mt-2 flex flex-wrap gap-1.5 lg:justify-center">
                      {data.checks.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1 rounded-md border border-brand-forest/25 bg-brand-forest/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-brand-forest">
                          <Check className="size-3" aria-hidden />
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-1.5 text-[15px] leading-snug text-brand-charcoal/75 text-pretty whitespace-pre-line">{step.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Шкала времени: от предыдущего коммита до этого */}
        <div className="mt-7 flex flex-col gap-4 rounded-2xl border-2 border-brand-navy/15 bg-brand-cream/80 p-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
          <div className="flex flex-1 items-center gap-3">
            <span className="font-mono text-sm font-black text-brand-navy tabular-nums">{data.from}</span>
            <span className="relative h-2 flex-1 rounded-full bg-brand-navy/10" aria-hidden>
              <span className="absolute inset-y-0 left-0 w-full rounded-full bg-brand-forest/70" />
              <span className="absolute top-1/2 right-0 size-4 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-brand-navy bg-brand-yellow" />
            </span>
            <span className="font-mono text-sm font-black text-brand-navy tabular-nums">{data.to}</span>
          </div>
          <div className="flex items-center gap-3 sm:border-l-2 sm:border-brand-navy/10 sm:pl-6">
            <span className="font-marker text-4xl leading-none text-brand-forest">{data.minutes}</span>
            <span className="max-w-[16rem] text-xs leading-snug font-bold text-brand-charcoal/70 text-pretty">
              с правкой и проверками
            </span>
          </div>
        </div>

        {data.repoUrl && (
          <a
            href={data.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary underline underline-offset-4 hover:text-foreground"
          >
            Открыть демо-репозиторий
            <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
        )}
      </div>
    </div>
  );
}
