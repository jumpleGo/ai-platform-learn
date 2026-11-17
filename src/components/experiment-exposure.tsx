'use client';

import { useEffect } from 'react';
import posthog from '@/lib/analytics/posthog';
import { getExperiment, type ExperimentKey } from '@/lib/experiments';
import { EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';
import { isBot } from '@/lib/analytics/bot-detection';

// Экспозиция для теста, вариант которого выбран на сервере (useExperiment не подходит:
// он решает жребий на клиенте, и страница успела бы моргнуть полной версией).
// Разметки не даёт — только событие и супер-свойство $feature/<key>.
export function ExperimentExposure({ experimentKey, variant }: { experimentKey: ExperimentKey; variant: string }) {
  useEffect(() => {
    if (isBot()) return;
    const experiment = getExperiment(experimentKey);
    if (experiment.status !== 'running') return;
    posthog.register({ [`$feature/${experimentKey}`]: variant });
    const seenKey = `gelato:exp:${experimentKey}`;
    if (sessionStorage.getItem(seenKey) === variant) return;
    sessionStorage.setItem(seenKey, variant);
    track(EVENTS.experimentExposed, { experiment: experimentKey, variant });
  }, [experimentKey, variant]);

  return null;
}
