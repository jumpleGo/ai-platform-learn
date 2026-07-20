// Рукописные маркерные дудлы — декоративный акцент в стиле «стены для заметок».
// Каждый глиф — это просто <svg>, позиционируется снаружи через wrapper className.

type DoodleProps = { className?: string };

// Мороженое-рожок: своя палитра зашита в глиф (розовый/белый/жёлтый), currentColor не участвует
function DoodleIceCream({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 48 60" fill="none" className={className} aria-hidden>
      <path
        d="M24 6C13 6 8 14 10 20C6 21 6 27 11 28C8 30 9 35 14 35.5C17 40 20 44 23 52C26 44 29 39.5 32.5 35C37 34 37.5 29.5 34.5 27.5C39 26 38.5 20.5 34 19.5C36 13.5 31 6 24 6Z"
        fill="oklch(0.72 0.19 5)"
        stroke="white"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 21C16 24 20 18 24 22C28 26 32 19 35 21.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M13 29C17 32 21 26.5 25 30C29 33.5 32 28 34.5 29.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <ellipse cx="17" cy="15" rx="2.6" ry="1.8" fill="oklch(0.86 0.16 95)" transform="rotate(-25 17 15)" />
    </svg>
  );
}

// Тонкий вафельный рожок-каракуля с расходящимися чёрточками — отдельный акцент к мороженому
function DoodleCone({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 34 40" fill="none" className={className} aria-hidden>
      <path
        d="M6 10L17 36L28 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6.5 10.5L27.5 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 15L24 15.5M8 20L23 20.5M10.5 25L21 25.5M12.5 29.5L18.5 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 15L21 25.5M24 15.5L12.5 29.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 4L6.5 8M17 1V6M31 4L27.5 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Симметричная мандала тонкими линиями — 4 сдвоенных лепестка вокруг центра
function DoodleMandala({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      {[0, 45, 90, 135].map((deg) => (
        <ellipse
          key={deg}
          cx="24"
          cy="24"
          rx="16"
          ry="5.5"
          stroke="currentColor"
          strokeWidth="1.4"
          transform={`rotate(${deg} 24 24)`}
        />
      ))}
      <circle cx="24" cy="24" r="3.4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

// Кружевная завитушка-пейсли: один плавный росчерк с завитком на конце
function DoodlePaisley({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <path
        d="M8 30C4 22 8 10 18 8C28 6 34 14 30 20C27 24.5 21 23 21.5 18.5C22 15 27 14.5 27.5 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="10" cy="33" r="1.6" fill="currentColor" />
      <circle cx="15" cy="35.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

// Сердце с искрами-чёрточками по бокам — «sparkle heart»
function DoodleSparkleHeart({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 44 40" fill="none" className={className} aria-hidden>
      <path
        d="M22.5 34.5C21 33 8 24.5 8.5 15.5C8.8 10.3 13.5 7.7 16.7 9.5C19.3 11 21.5 14.3 22 17C23 14 25.5 10.6 28.5 9.3C32 7.8 36 10.5 35.5 15.5C35 24.5 24 33 22.5 34.5Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 10L6 12.5M2.5 17L6 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M40 9L37.5 12M41 16L37 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Восьмиконечный звёздный взрыв — чуть неровный, от руки
function DoodleStarburst({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <path
        d="M20 2L23 15.5L34 7.5L25.5 18L38 20.5L25 22.5L33 34L21.5 26L19 38L16.5 25.5L5.5 33L14 22L2 19.5L14.5 17.5L6 6.5L17 15Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Плоский мультяшный персонаж: заливка currentColor, огромные глаза, без носа
function DoodleToonFace({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 44 44" fill="none" className={className} aria-hidden>
      <path
        d="M22 4.5C11.5 4 4.5 11.5 4.5 21.5C4.5 32 12.5 39.5 22.5 39.5C33 39.5 39.5 31.5 39 21C38.5 11 31.5 5 22 4.5Z"
        fill="currentColor"
        stroke="oklch(0.25 0.02 60)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="21" r="5.2" fill="white" />
      <circle cx="29" cy="20.5" r="5.2" fill="white" />
      <circle cx="16.5" cy="22" r="2.2" fill="oklch(0.25 0.02 60)" />
      <circle cx="29.5" cy="21.5" r="2.2" fill="oklch(0.25 0.02 60)" />
      <ellipse cx="22.5" cy="31" rx="3.2" ry="2.2" fill="oklch(0.25 0.02 60)" />
    </svg>
  );
}

// Один разбросанный акцент: свой глиф, позиция, поворот и цвет маркера задаются снаружи.
export function DoodleScatter({
  glyph,
  className,
  color,
}: {
  glyph: 'icecream' | 'cone' | 'mandala' | 'paisley' | 'sparkleheart' | 'starburst' | 'toonface';
  className: string;
  color?: string;
}) {
  const Glyph = {
    icecream: DoodleIceCream,
    cone: DoodleCone,
    mandala: DoodleMandala,
    paisley: DoodlePaisley,
    sparkleheart: DoodleSparkleHeart,
    starburst: DoodleStarburst,
    toonface: DoodleToonFace,
  }[glyph];
  return (
    <div className={`pointer-events-none absolute select-none ${className}`} style={{ color }} aria-hidden>
      <Glyph className="h-full w-full" />
    </div>
  );
}

// Граффити-надпись: жирный «пузырь» с белой обводкой-стикером, как у остальных дудлов
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
      style={{ color, WebkitTextStroke: '3px white', paintOrder: 'stroke fill' }}
      aria-hidden
    >
      {text}
    </div>
  );
}
