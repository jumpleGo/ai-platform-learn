import { plural } from '@/lib/utils';
import type { MaterialsTeaser as Teaser } from '@/lib/markdown';

// Материалы закрытого урока: показываем оглавление — о чём пойдёт речь, без самого текста
export function MaterialsTeaser({ teaser }: { teaser: Teaser }) {
  const { topics, more, facts, intro } = teaser;
  return (
    <div>
      {topics.length > 0 ? (
        <>
          <p className="leading-relaxed text-muted-foreground">В материалах урока разбираем:</p>
          <ul className="mt-3 space-y-1.5">
            {topics.map((topic, i) => (
              <li key={i} className="flex gap-2.5 leading-relaxed text-foreground/90">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
          {more > 0 && (
            <p className="mt-2 pl-6 text-sm text-muted-foreground">
              и&nbsp;ещё {more} {plural(more, ['раздел', 'раздела', 'разделов'])}
            </p>
          )}
        </>
      ) : (
        intro && <p className="leading-relaxed text-pretty text-muted-foreground">{intro}</p>
      )}
      {facts.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {facts.map((fact, i) => (
            <li
              key={i}
              className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground"
            >
              {fact}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
