import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { plainText } from '@/lib/markdown';
import { nbsp } from '@/lib/typography';

// «Обложка цепляющая» из эскиза: крупная карточка-плитка для витрин бесплатных
// материалов и обучений. Картинка — фон под текстом: название маркерным шрифтом лежит
// поверх неё. Обложки есть не у всех, без картинки фоном служит бумажная плашка бренда.

// Цвета плиток идут по кругу: рядом стоящие карточки не повторяются.
const TONES = [
  { bg: 'bg-brand-sky', ink: 'text-brand-navy' },
  { bg: 'bg-brand-yellow', ink: 'text-brand-charcoal' },
  { bg: 'bg-brand-green', ink: 'text-brand-cream' },
  { bg: 'bg-brand-red', ink: 'text-brand-cream' },
  { bg: 'bg-brand-navy', ink: 'text-brand-cream' },
] as const;

export type CoverCardProps = {
  href: string;
  title: string;
  // Надстрочная метка на обложке: «Урок 02», «8 уроков»
  kicker?: string | null;
  // Текст под обложкой — коротко и цепко, для кого это
  note?: string | null;
  imageUrl?: string | null;
  // Стикер в углу обложки: «Бесплатно», «Скоро»
  badge?: string | null;
  // Индекс в сетке — им выбирается цвет плашки и задержка появления
  index?: number;
  // Соотношение сторон обложки: уроки — как видео, обучения — квадрат
  ratio?: 'video' | 'square' | 'wide';
  // Чистая обложка без надписей: превью урока говорит само за себя, подпись есть под ним
  bareCover?: boolean;
  // Своя короткая надпись поверх чистой обложки — приходит из админки урока
  coverCaption?: string | null;
  meta?: string | null;
};

export function CoverCard({
  href,
  title,
  kicker,
  note,
  imageUrl,
  badge,
  index = 0,
  ratio = 'square',
  bareCover = false,
  coverCaption,
  meta,
}: CoverCardProps) {
  const tone = TONES[index % TONES.length];
  // Что лежит поверх обложки: у обучений — название карточки, у уроков с чистым превью —
  // только своя надпись из админки. На пустой плашке надпись оставляем всегда, иначе
  // карточка выглядит недогруженной
  const coverTitle = bareCover ? coverCaption?.trim() || (imageUrl ? '' : title) : title;
  return (
    <Link
      href={href}
      className="group animate-float block space-y-3"
      style={{ '--rise-delay': `${Math.min(index, 8) * 0.05}s` } as React.CSSProperties}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border border-border shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-lg motion-reduce:group-hover:translate-y-0 ${
          ratio === 'video' ? 'aspect-video' : ratio === 'wide' ? 'aspect-[4/3]' : 'aspect-square'
        } ${tone.bg}`}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* под надписью картинка уходит в бумагу — название читается, а обложка не темнеет */}
            {coverTitle && (
              <span
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-brand-cream via-brand-cream/85 to-transparent"
                aria-hidden
              />
            )}
          </>
        ) : (
          /* бумажная текстура поверх цвета — плашка выглядит печатной, а не залитой */
          <span
            className="pointer-events-none absolute inset-0 bg-[url(/banner-home-paper.webp)] bg-cover bg-center opacity-45 mix-blend-multiply"
            aria-hidden
          />
        )}
        {coverTitle && (
          <div
            className={`relative flex size-full flex-col justify-between p-5 ${
              // на картинке текст тёмный с кремовым ореолом: читается без затемнения обложки
              imageUrl
                ? 'text-brand-navy [text-shadow:0_1px_10px_oklch(0.9881_0.0184_103.4/0.95),0_0_2px_oklch(0.9881_0.0184_103.4)]'
                : tone.ink
            }`}
          >
            {/* стикер-бейдж лежит в правом углу — метка обрезается, а не уезжает под него */}
            {kicker && (
              <p className={`truncate font-mono text-xs tracking-wide uppercase opacity-70 ${badge ? 'pr-20' : ''}`}>
                {plainText(kicker)}
              </p>
            )}
            {/* mt-auto держит надпись внизу и без верхней метки */}
            <p className="mt-auto font-marker text-2xl leading-[1.05] text-balance sm:text-[1.75rem]">
              {nbsp(plainText(coverTitle))}
            </p>
          </div>
        )}
        {badge && (
          <span className="absolute top-3 right-3 rounded-full border border-brand-navy/15 bg-brand-cream/95 px-2.5 py-1 font-mono text-[11px] tracking-wide text-brand-navy uppercase shadow-sm">
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-1.5 px-0.5">
        <p className="flex items-start gap-1 text-[15px] leading-snug font-bold text-balance transition-colors group-hover:text-primary">
          {nbsp(plainText(title))}
          <ArrowUpRight
            className="mt-0.5 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </p>
        {note && <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{nbsp(plainText(note))}</p>}
        {/* тех. строка (длительность, курс) — отдельный слой: линия и разрядка
            отбивают её от смыслового текста карточки */}
        {meta && (
          <p className="mt-3 border-t border-border pt-2.5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground/80 uppercase">
            {meta}
          </p>
        )}
      </div>
    </Link>
  );
}
