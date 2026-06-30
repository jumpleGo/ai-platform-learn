'use client';
import { useEffect, useRef, useState } from 'react';

// «Живой» счётчик присутствия: число мягко колеблется вокруг базы случайным блужданием.
// На сервере возвращает null (рендерим плейсхолдер) — чтобы не было рассинхрона гидрации.
export function useLiveCount(base: number): number | null {
  const [n, setN] = useState<number | null>(null);
  const value = useRef(base);

  useEffect(() => {
    const lo = Math.max(1, Math.floor(base * 0.7));
    const hi = Math.ceil(base * 1.35) + 1;
    // стартуем с лёгким разбросом, чтобы при каждом заходе число было разным
    value.current = Math.min(hi, Math.max(lo, base + Math.floor((Math.random() - 0.5) * Math.max(2, base * 0.2))));
    setN(value.current);

    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      // чаще ±1 (один пришёл/ушёл), иногда скачок чуть крупнее
      const step = Math.random() < 0.8 ? 1 : 2;
      const dir = Math.random() < 0.5 ? -1 : 1;
      value.current = Math.min(hi, Math.max(lo, value.current + dir * step));
      setN(value.current);
      timer = setTimeout(tick, 2500 + Math.random() * 4000);
    };
    timer = setTimeout(tick, 2500 + Math.random() * 4000);
    return () => clearTimeout(timer);
  }, [base]);

  return n;
}
