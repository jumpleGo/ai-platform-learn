'use client';
import { useEffect, useRef } from 'react';

// Один раз при заходе на урок дёргает серверный экшен инкремента просмотров.
// Эффект не срабатывает при префетче — только при реальной навигации. Ничего не рендерит.
export function RecordView({ action }: { action: () => Promise<void> }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void action().catch(() => {});
  }, [action]);
  return null;
}
