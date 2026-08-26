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
