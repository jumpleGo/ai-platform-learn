import { describe, expect, it } from 'vitest';
import { EXPERIMENTS, getExperiment, pickVariant } from '../src/lib/experiments';
import {
  AGENTS_LANDING_BLOCKS,
  VIBE_GUEST_BLOCKS,
  pickAgentsBlocks,
  pickLandingPairs,
} from '../src/lib/landing-blocks';

const stopped = [
  ['vibe_landing_pairs', ['winner', 'plus_proof', 'plus_why']],
  ['agents_landing_blocks', ['control', 'core']],
  ['lesson_next_step', ['control', 'next_step']],
  ['lead_capture', ['control', 'form']],
] as const;

const visitors = [
  'anonymous',
  ...Array.from({ length: 1000 }, (_, i) =>
    `f47ac10b-58cc-4372-a567-${i.toString(16).padStart(12, '0')}`),
];

describe('Остановка A/B по задаче #152', () => {
  it('оставляет активным только home_offer', () => {
    const active = Object.values(EXPERIMENTS)
      .filter((experiment) => experiment.status === 'running')
      .map((experiment) => experiment.key);
    expect(active).toEqual(['home_offer']);
  });

  it.each(stopped)('%s сохраняет варианты и завершается без победителя', (key, variants) => {
    const experiment = getExperiment(key);
    expect(experiment.status).toBe('done');
    expect(experiment.variants).toEqual(variants);
    expect(experiment.winner).toBeUndefined();
    expect(experiment.decisionNote).toBeTruthy();
  });

  it.each(stopped)('%s отдаёт контроль всем посетителям', (key, variants) => {
    const experiment = getExperiment(key);
    const assigned = visitors.map((visitor) => pickVariant(experiment, visitor));
    expect(new Set(assigned)).toEqual(new Set([variants[0]]));
  });

  it.each(stopped)('%s игнорирует QA-выбор остановленных вариантов', (key, variants) => {
    const experiment = getExperiment(key);
    for (const forced of variants.slice(1)) {
      const assigned = visitors.map((visitor) => pickVariant(experiment, visitor, forced));
      expect(new Set(assigned)).toEqual(new Set([variants[0]]));
    }
  });

  it.each(['plus_proof', 'plus_why'])('лендинг вайбкода игнорирует cookie и QA-вариант %s', (variant) => {
    for (const choice of [{ remembered: variant }, { forced: variant }, { remembered: variant, forced: variant }]) {
      expect(pickLandingPairs({ visitorId: null, ...choice })).toEqual({
        variant: 'winner',
        blocks: VIBE_GUEST_BLOCKS,
      });
    }
  });

  it('лендинг agents игнорирует сохранённый core и QA-выбор', () => {
    for (const choice of [{ remembered: 'core' }, { forced: 'core' }, { remembered: 'core', forced: 'core' }]) {
      expect(pickAgentsBlocks({ visitorId: null, ...choice })).toEqual({
        variant: 'control',
        blocks: AGENTS_LANDING_BLOCKS,
      });
    }
  });
});

describe('pickVariant', () => {
  it('у завершённого теста без победителя прекращает жребий', () => {
    const experiment = { ...EXPERIMENTS.homeOffer, status: 'done' as const };
    expect(new Set(visitors.map((visitor) => pickVariant(experiment, visitor))))
      .toEqual(new Set(['control']));
  });

  it('сохраняет решения завершённых тестов с победителем', () => {
    for (const experiment of Object.values(EXPERIMENTS)) {
      if (experiment.status !== 'done' || !('winner' in experiment)) continue;
      expect(new Set(visitors.map((visitor) => pickVariant(experiment, visitor))))
        .toEqual(new Set([experiment.winner]));
    }
  });

  it('запланированный тест продолжает отдавать контроль', () => {
    expect(new Set(visitors.map((visitor) => pickVariant(EXPERIMENTS.vibeLandingOrder, visitor))))
      .toEqual(new Set(['tail']));
  });

  it('home_offer продолжает делить трафик детерминированно', () => {
    const assignments = visitors.map((visitor) => pickVariant(EXPERIMENTS.homeOffer, visitor));
    expect(new Set(assignments)).toEqual(new Set(['control', 'offer']));
    expect(visitors.map((visitor) => pickVariant(EXPERIMENTS.homeOffer, visitor))).toEqual(assignments);
  });

  it('home_offer сохраняет QA-выбор, неизвестный вариант игнорируется', () => {
    for (const forced of EXPERIMENTS.homeOffer.variants) {
      expect(pickVariant(EXPERIMENTS.homeOffer, 'anonymous', forced)).toBe(forced);
    }
    expect(pickVariant(EXPERIMENTS.homeOffer, 'anonymous', 'unknown'))
      .toBe(pickVariant(EXPERIMENTS.homeOffer, 'anonymous'));
  });
});
