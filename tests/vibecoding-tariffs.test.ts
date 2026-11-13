import { beforeAll, describe, expect, it, vi } from 'vitest';
import { isLessonPublished } from '@/lib/access';
import {
  COURSE_PAYMENT_CONFIGS, DEFAULT_TARIFFS, getTariffsForCourse, type Tariff,
} from '@/lib/payments/tariffs';
import tariffsMain from './fixtures/tariffs-main.json';

type PublicLesson = {
  id: string;
  number: number;
  title: string;
  published?: boolean;
  isTest?: boolean;
};

const vibecodingSlugs = Object.keys(COURSE_PAYMENT_CONFIGS).filter((slug) =>
  getTariffsForCourse(slug).some((tariff) => tariff.id.startsWith('vibecoding_')),
);

describe('vibecoding tariff copy against the live published catalog', () => {
  let publishedCount: number;

  beforeAll(async () => {
    // Production lessons live in Firestore. Fetch current public data on every
    // run; a network or parser failure must fail this check, never use a snapshot.
    const [lessonHtml, landingHtml] = await Promise.all([
      '/courses/vibecoding/lessons/1', '/courses/vibecoding',
    ].map(async (path) => {
      const response = await fetch(`https://gelato.education${path}`, {
        signal: AbortSignal.timeout(20_000),
      });
      expect(response.status, path).toBe(200);
      return response.text();
    }));

    // CourseLessonsNav receives these items from getPublishedCoursesWithLessons
    // in src/app/(app)/courses/[courseSlug]/lessons/layout.tsx.
    const flight = [...lessonHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gu)]
      .flatMap(([, script]) => {
        const push = script.match(/^self\.__next_f\.push\(([\s\S]*)\);?$/u);
        if (!push) return [];
        const [kind, payload] = JSON.parse(push[1]);
        return kind === 1 && typeof payload === 'string' ? [payload] : [];
      }).join('');
    const nav = flight.match(/"courseKey":"vibecoding","items":(\[[\s\S]*?\]),"completedCount":/u);
    expect(nav, 'current public lesson navigation').not.toBeNull();
    const lessons: PublicLesson[] = JSON.parse(nav![1]);
    expect(lessons.length).toBeGreaterThan(0);
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(lessons.length);

    // Same predicate as #264; omitted publication flags retain the catalog's
    // legacy convention. The live landing independently verifies the count.
    publishedCount = lessons.filter((lesson) => isLessonPublished(lesson) && !lesson.isTest).length;
    const visibleLanding = landingHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gu, '')
      .replace(/<[^>]*>/gu, '').replace(/\s+/gu, ' ');
    const landingCounts = [...visibleLanding.matchAll(/Опубликовано уроков: (\d+)\./gu)]
      .map((match) => Number(match[1]));
    expect(landingCounts.length).toBeGreaterThan(0);
    expect(new Set(landingCounts)).toEqual(new Set([publishedCount]));
  }, 30_000);

  it.each(vibecodingSlugs)('%s promises the current published lesson count in every tariff', (slug) => {
    for (const tariff of getTariffsForCourse(slug)) {
      const copy = [tariff.description, ...tariff.features].join(' ');
      expect.soft(copy).toContain(`Опубликовано уроков: ${publishedCount}.`);
      expect.soft(copy).not.toMatch(/вся программа курса|ко всем \d+ урокам/iu);
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
