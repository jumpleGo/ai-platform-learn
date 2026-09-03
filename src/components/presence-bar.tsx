'use client';
import { useEffect, useRef, useState } from 'react';

// Индикатор присутствия в шапке: обычно держится на 1–2, иногда постепенно
// поднимается до 3–5 и возвращается назад. Ноль не показываем.
export function PresenceBar({ registered }: { registered: number }) {
  const [n, setN] = useState(1);
  const value = useRef(1);

  useEffect(() => {
    const hi = Math.min(5, Math.max(1, registered));
    value.current = Math.min(hi, Math.random() < 0.7 ? 1 : 2);
    setN(value.current);

    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const roll = Math.random();
      let step = 0;

      if (value.current === 1) {
        step = roll < 0.45 ? 1 : 0;
      } else if (value.current === 2) {
        step = roll < 0.34 ? -1 : roll > 0.72 ? 1 : 0;
      } else {
        // Высокие значения — редкий короткий всплеск, а не постоянное состояние.
        step = roll < 0.58 ? -1 : roll > 0.86 ? 1 : 0;
      }

      value.current = Math.min(hi, Math.max(1, value.current + step));
      setN(value.current);
      timer = setTimeout(tick, 4_000 + Math.random() * 6_000);
    };

    timer = setTimeout(tick, 4_000 + Math.random() * 6_000);
    return () => clearTimeout(timer);
  }, [registered]);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 font-mono text-xs text-muted-foreground"
      title="Сейчас на платформе"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-green/70" />
        <span className="relative inline-flex size-2 rounded-full bg-brand-green" />
      </span>
      <span className="tabular-nums text-foreground/80">{n}</span>
      <span className="hidden sm:inline">
        {n === 1 ? 'учится' : 'учатся'}&nbsp;сейчас
      </span>
    </span>
  );
}
