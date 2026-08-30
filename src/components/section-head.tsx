import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Accent } from '@/components/accent';
import { nbsp } from '@/lib/typography';

// Общая шапка секции: заголовок, пояснение и ссылка вбок. Один ритм на всех
// публичных страницах. Надстрочных меток нет — они дробили страницу мелким
// текстом; смысл несут сам заголовок и расстояние до соседней секции.
// Цветом выделяется только главный заголовок страницы (h1), здесь — росчерк.

/** Подчёркивает «от руки» кусок заголовка. Пробелы внутри могут быть неразрывными. */
export function withAccent(text: string, accent?: string) {
  if (!accent) return text;
  const pattern = accent
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[\s ]+/g, '[\\s\\u00a0]+');
  const match = new RegExp(pattern).exec(text);
  if (!match) return text;
  return (
    <>
      {text.slice(0, match.index)}
      <Accent>{match[0]}</Accent>
      {text.slice(match.index + match[0].length)}
    </>
  );
}

export function SectionHead({
  title,
  accent,
  note,
  action,
}: {
  title: string;
  /** слово или фраза из заголовка, которую выделяем росчерком */
  accent?: string;
  note?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="max-w-2xl space-y-3">
        <h2 className="font-heading text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          {withAccent(nbsp(title), accent)}
        </h2>
        {note && (
          <p className="text-[17px] leading-relaxed text-muted-foreground text-pretty whitespace-pre-line">
            {nbsp(note)}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-foreground"
        >
          {action.label}
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
