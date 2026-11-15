import { describe, expect, it, vi } from 'vitest';
import {
  COURSE_PAYMENT_CONFIGS, DEFAULT_TARIFFS, getTariffsForCourse, type Tariff,
} from '@/lib/payments/tariffs';
import tariffsMain from './fixtures/tariffs-main.json';

const vibecodingSlugs = Object.keys(COURSE_PAYMENT_CONFIGS).filter((slug) =>
  getTariffsForCourse(slug).some((tariff) => tariff.id.startsWith('vibecoding_')),
);

const LESSON_COUNT_RE = /\d+\s*урок|урок\p{L}*\s*[:—-]?\s*\d+|опубликовано\s+уроков/iu;
const NEW_WORDING = 'по мере выхода';

describe('vibecoding tariff copy carries no hand-maintained lesson count', () => {
  it.each([
    'Опубликовано уроков: 7.',
    'Опубликовано уроков: 8.',
    '17 уроков',
    'ко всем 17 урокам',
    'уроков — 12',
  ])('guard matches the old literal %j', (old) => {
    expect(old).toMatch(LESSON_COUNT_RE);
  });

  it.each(vibecodingSlugs)('%s describes access without a number of lessons', (slug) => {
    for (const tariff of getTariffsForCourse(slug).filter((t) => t.id.startsWith('vibecoding_'))) {
      const texts = [tariff.description, ...tariff.features];
      for (const text of texts) {
        expect.soft(text, tariff.id).not.toMatch(LESSON_COUNT_RE);
      }
      expect.soft(texts.join(' '), tariff.id).toContain(NEW_WORDING);
    }
  });

  it('has no obsolete 17-lesson promises in defaults or any course tariff', () => {
    const allTariffs = [
      ...DEFAULT_TARIFFS,
      ...Object.values(COURSE_PAYMENT_CONFIGS).flatMap((config) => config.tariffs),
    ];
    for (const tariff of allTariffs) {
      expect.soft(JSON.stringify(tariff), tariff.id).not.toMatch(/17\s+урок|все\s+17/iu);
    }
  });
});

it('preserves every tariff field outside description and features from main', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(tariffsMain.capturedAt));
  try {
    const withoutCopy = (tariffs: Tariff[]) => tariffs.map(({
      description: _description, features: _features, ...unchanged
    }) => unchanged);
    expect({
      defaults: withoutCopy(DEFAULT_TARIFFS),
      courses: Object.fromEntries(Object.entries(COURSE_PAYMENT_CONFIGS).map(([slug, config]) => [
        slug, { ...config, tariffs: withoutCopy(config.tariffs) },
      ])),
    }).toEqual(tariffsMain.config);
  } finally {
    vi.useRealTimers();
  }
});
