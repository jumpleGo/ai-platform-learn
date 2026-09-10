'use client';

import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { getExperiment, pickVariant, type ExperimentKey } from './experiments';
import { EVENTS } from './analytics/events';
import { track } from './analytics/track-client';

function readVisitorId(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)vid=([\w-]{8,64})/);
  if (match) return match[1];
  // vid ставит proxy, но на всякий случай — id PostHog, чтобы жребий не был случайным
  return posthog.__loaded ? posthog.get_distinct_id() : null;
}

// Ручной выбор варианта для QA: ?exp_<key>=<variant>
function readForcedVariant(key: string): string | null {
  const value = new URLSearchParams(window.location.search).get(`exp_${key}`);
  return value || null;
}

// Возвращает вариант эксперимента для текущего посетителя. До монтирования — null,
// чтобы серверный и первый клиентский рендер совпадали. Экспозицию отправляем
// только когда `active` — то есть когда тестируемый элемент реально показан
// (иначе в контроль попадут люди, которые плашки вообще не видели).
export function useExperiment(key: ExperimentKey, active: boolean): string | null {
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    const experiment = getExperiment(key);
    const forced = readForcedVariant(key);
    if (forced && experiment.variants.includes(forced)) {
      setVariant(forced);
      return;
    }
    const vid = readVisitorId();
    setVariant(pickVariant(experiment, vid ?? 'anonymous'));
  }, [key]);

  useEffect(() => {
    if (!variant || !active) return;
    const experiment = getExperiment(key);
    if (experiment.status !== 'running') return;
    // $feature/<key> — формат PostHog: по нему разрезаются любые последующие события
    // и работает вкладка Experiments, если завести там флаг с тем же ключом
    if (posthog.__loaded) posthog.register({ [`$feature/${key}`]: variant });
    const seenKey = `gelato:exp:${key}`;
    if (sessionStorage.getItem(seenKey) === variant) return;
    sessionStorage.setItem(seenKey, variant);
    track(EVENTS.experimentExposed, { experiment: key, variant });
  }, [key, variant, active]);

  return variant;
}
