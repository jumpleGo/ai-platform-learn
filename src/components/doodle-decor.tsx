// Граффити-надпись: жирный «пузырь» с кремовой обводкой-стикером.
// Картиночные дудлы убраны — остались только маркерные надписи.
export function DoodleWord({
  text,
  className,
  color,
}: {
  text: string;
  className: string;
  color: string;
}) {
  return (
    <div
      className={`font-marker pointer-events-none absolute leading-none select-none ${className}`}
      style={{
        color,
        WebkitTextStroke: '2px oklch(0.9881 0.0184 103.4)',
        paintOrder: 'stroke fill',
      }}
      aria-hidden
    >
      {text}
    </div>
  );
}

export function DoodleUnderline({
  className = '',
  color = 'var(--color-goose-red)',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 160 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none absolute -bottom-1.5 left-0 w-full overflow-visible select-none ${className}`}
      aria-hidden
    >
      <path
        d="M2 7.5C28.5 2.5 75 1.8 158 8.5C118 4 62 5.5 15 10.5"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

