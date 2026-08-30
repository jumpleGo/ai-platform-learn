// Акценты в тексте в стиле бренда: маркерный росчерк под словом и стикер-тег.
// Заменяют «жирным и другим цветом» — на всех страницах выделяем одинаково.

const UNDERLINES = {
  // одиночный росчерк — базовое выделение
  single: 'M3 9.2C26 4.1 56 2.6 84 4.4 100 5.5 111 7.2 117 9.4',
  // двойной проход маркера — для главного слова на странице
  double: 'M3 8.4C27 3.3 58 1.9 86 3.7 101 4.8 111 6.3 117 8.2M8 12.1C33 8.4 62 7.4 88 8.6 101 9.2 110 10.1 115 11.2',
} as const;

/**
 * Выделение внутри текста: жирный + росчерк «от руки». Вес — 800, чтобы
 * в обычном тексте акцент читался, а внутри и без того жирного заголовка
 * не оказался легче соседних слов. Росчерк лежит отдельным слоем и не влияет
 * на перенос и высоту строки.
 */
export function Accent({
  children,
  color = 'var(--color-brand-navy)',
  stroke = 'single',
  className = '',
}: {
  children: React.ReactNode;
  color?: string;
  stroke?: keyof typeof UNDERLINES;
  className?: string;
}) {
  return (
    <span className={`relative inline-block font-extrabold ${className}`}>
      <span className="relative">{children}</span>
      <svg
        className="pointer-events-none absolute inset-x-0 -bottom-[0.12em] h-[0.3em] w-full overflow-visible"
        viewBox="0 0 120 14"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={UNDERLINES[stroke]}
          fill="none"
          stroke={color}
          strokeWidth={3.2}
          strokeLinecap="round"
          /* толщина не тянется вместе с шириной слова */
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}

/**
 * Выделение внутри заголовка страницы: только вес. Сам заголовок целиком синий,
 * второй цвет и росчерк на таком кегле мельчат.
 */
export function TitleAccent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-extrabold ${className}`}>{children}</span>;
}

const TONES = {
  yellow: 'bg-brand-yellow text-brand-navy border-brand-navy',
  sky: 'bg-brand-sky text-brand-navy border-brand-navy',
  navy: 'bg-brand-navy text-brand-cream border-brand-navy',
  green: 'bg-brand-forest text-brand-cream border-brand-navy',
} as const;

/**
 * Наклейка-тег: маркерный шрифт, лёгкий наклон, плотная тень уступом —
 * тот же приём, что у кнопок бренда.
 */
export function StickerTag({
  children,
  tone = 'yellow',
  className = '',
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      className={`font-marker inline-flex -rotate-2 items-center rounded-full border-2 px-3.5 py-1 text-sm leading-none shadow-[0_2px_0_0_var(--color-brand-navy)] sm:text-base ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
