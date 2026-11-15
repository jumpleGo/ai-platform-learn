'use client';

import type { ReactNode } from 'react';
import { useExperiment } from '@/lib/experiments-client';

// Место под плеером бесплатного урока, где идёт тест lesson_next_step: контроль — текущая
// плашка «Вернуться к тарифам» (или ничего, если пришли не с лендинга), вариант — блок
// «что дальше в курсе». Оба варианта собраны на сервере и приходят готовыми узлами;
// здесь только жребий. До монтирования не рисуем ничего, чтобы контроль не мигал.
export function LessonNextStepSlot({ control, nextStep }: { control: ReactNode; nextStep: ReactNode }) {
  const variant = useExperiment('lesson_next_step', true);
  if (variant === null) return null;
  return <>{variant === 'next_step' ? nextStep : control}</>;
}
