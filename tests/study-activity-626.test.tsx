import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompleteLessonButton, pluralizeDays } from '@/components/complete-lesson-button';
import { completeLesson } from '@/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions';
import { getStudyStreak, recordDailyActivity } from '@/lib/db/progress';
import oldCompletion from './fixtures/study-activity-d5bc61f.json';

const s = vi.hoisted(() => {
  const db = new Map<string, Record<string, any>>();
  const revalidated: string[] = [];
  let shouldFailActivity = false;

  return {
    db,
    revalidated,
    queries: [] as { path: string; filters: [string, string, unknown][] }[],
    transactionTail: Promise.resolve(),
    setFailActivity: (fail: boolean) => {
      shouldFailActivity = fail;
    },
    getFailActivity: () => shouldFailActivity,
    session: vi.fn(),
  };
});

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => {
    s.revalidated.push(path);
  },
  unstable_cache: (fn: any) => fn,
}));
vi.mock('@/lib/session', () => ({
  getSession: s.session,
}));
vi.mock('firebase-admin/firestore', () => ({
  FieldPath: { documentId: () => '__name__' },
  FieldValue: {
    arrayUnion: (...elements: unknown[]) => ({ _type: 'arrayUnion', elements }),
    increment: (n: number) => ({ _type: 'increment', n }),
  },
}));
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (path: string) => {
      const filters: [string, string, unknown][] = [];
      const query = {
        where: (field: string, operator: string, value: unknown) => {
          filters.push([field, operator, value]);
          return query;
        },
        get: async () => {
          if (path.endsWith('/activity') && s.getFailActivity()) throw new Error('Activity read failed');
          s.queries.push({ path, filters: [...filters] });
          const docs = [...s.db.entries()].filter(([docPath, data]) => {
            if (!docPath.startsWith(`${path}/`)) return false;
            const id = docPath.slice(path.length + 1);
            if (id.includes('/')) return false;
            return filters.every(([field, operator, value]) => {
              const actual = field === '__name__' ? id : data[field];
              if (operator === '>=') return actual >= (value as string);
              if (operator === '<=') return actual <= (value as string);
              if (operator === '==') return actual === value;
              throw new Error(`Unsupported query operator ${operator}`);
            });
          }).map(([docPath, data]) => ({ id: docPath.slice(path.length + 1), data: () => data }));
          return { docs };
        },
      };
      return query;
    },
    // Serialize transactions and commit buffered writes after the callback succeeds.
    runTransaction: async (update: (tx: any) => Promise<unknown>) => {
      const previous = s.transactionTail;
      let unlock!: () => void;
      s.transactionTail = new Promise<void>(resolve => { unlock = resolve; });
      await previous;
      const writes: (() => Promise<void>)[] = [];
      try {
        const result = await update({
          get: (ref: any) => ref.get(),
          set: (ref: any, data: Record<string, any>, options: { merge: boolean }) => {
            writes.push(() => ref.set(data, options));
          },
        });
        for (const write of writes) await write();
        return result;
      } finally {
        unlock();
      }
    },
    doc: (docPath: string) => ({
      path: docPath,
      get: async () => {
        if (docPath.includes('/activity/') && s.getFailActivity()) {
          throw new Error('Firestore activity write failed');
        }
        const data = s.db.get(docPath);
        return {
          exists: data !== undefined,
          data: () => data,
        };
      },
      set: async (data: Record<string, any>, options?: { merge?: boolean }) => {
        if (docPath.includes('/activity/') && s.getFailActivity()) {
          throw new Error('Firestore activity write failed');
        }
        const current = options?.merge ? (s.db.get(docPath) ?? {}) : {};
        const merged: Record<string, any> = { ...current };
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === 'object' && val._type === 'arrayUnion') {
            const arr = Array.isArray(merged[key]) ? [...merged[key]] : [];
            for (const elem of val.elements) {
              if (!arr.includes(elem)) arr.push(elem);
            }
            merged[key] = arr;
          } else {
            merged[key] = val;
          }
        }
        s.db.set(docPath, merged);
      },
    }),
  },
}));

function getMoscowDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

describe('Study activity and completion reminder (#626)', () => {
  beforeEach(() => {
    s.db.clear();
    s.revalidated.length = 0;
    s.queries.length = 0;
    s.transactionTail = Promise.resolve();
    s.setFailActivity(false);
    s.session.mockResolvedValue({ uid: 'user-626', email: 'user@example.com' });
    vi.restoreAllMocks();
  });

  describe('CompleteLessonButton UI', () => {
    it.each([0, 1])('hides the streak for %s study days', streakDays => {
      const html = renderToStaticMarkup(
        <CompleteLessonButton
          courseId="course-test"
          lessonId="lesson-1"
          path="/courses/course-test/lessons/1"
          completed={true}
          streakDays={streakDays}
          hasNextLesson={true}
        />,
      );

      expect(html).toContain('Пройдено');
      expect(html).not.toContain('Вы учитесь');
      assertReloadedCompletion(html);
    });

    it.each([2, 3])('shows %s days from activity data under "Пройдено"', streakDays => {
      const html = renderToStaticMarkup(
        <CompleteLessonButton courseId="course-test" lessonId="lesson-1"
          path="/courses/course-test/lessons/1" completed={true}
          streakDays={streakDays} hasNextLesson={true} />,
      );
      const streak = `Вы учитесь ${streakDays} дня подряд`;
      expect(html).toContain(streak);
      expect(html.indexOf('Пройдено')).toBeLessThan(html.indexOf(streak));
      assertReloadedCompletion(html);
    });

    it('does not promise a next lesson on the last lesson of the course', () => {
      const html = renderToStaticMarkup(
        <CompleteLessonButton courseId="course-test" lessonId="lesson-last"
          path="/courses/course-test/lessons/3" completed={true}
          streakDays={3} hasNextLesson={false} />,
      );
      expect(html).not.toContain('Завтра продолжите со следующего урока');
    });

    it('the reload invariant rejects the frozen minimal d5bc61f fixture', () => {
      expect(oldCompletion.commit).toBe('d5bc61f527e6775944695d07b17719a828e7b5be');
      expect(oldCompletion.slugs).toEqual(['course-test']);
      expect(() => assertReloadedCompletion(oldCompletion.completedText)).toThrow();
    });

    it('does not render reminder when completed is false', () => {
      const html = renderToStaticMarkup(
        <CompleteLessonButton
          courseId="course-test"
          lessonId="lesson-1"
          path="/courses/course-test/lessons/1"
          completed={false}
        />,
      );

      expect(html).toContain('Урок пройден');
      expect(html).not.toContain('Отлично! Завтра продолжите со следующего урока');
      expect(html).not.toContain('Пройдено');
      expect(html).not.toContain('Вы учитесь');
    });
  });

  describe('pluralizeDays', () => {
    it.each([
      { count: 1, expected: 'день' },
      { count: 2, expected: 'дня' },
      { count: 3, expected: 'дня' },
      { count: 4, expected: 'дня' },
      { count: 5, expected: 'дней' },
      { count: 11, expected: 'дней' },
      { count: 12, expected: 'дней' },
      { count: 14, expected: 'дней' },
      { count: 21, expected: 'день' },
      { count: 22, expected: 'дня' },
      { count: 25, expected: 'дней' },
      { count: 101, expected: 'день' },
      { count: 111, expected: 'дней' },
    ])('declines $count as "$expected"', ({ count, expected }) => {
      expect(pluralizeDays(count)).toBe(expected);
    });
  });

  describe('getStudyStreak: last 30 Moscow calendar days', () => {
    const now = Date.parse('2026-11-16T12:00:00Z');
    function seed(dates: string[]) {
      for (const date of dates) s.db.set(`users/user-626/activity/${date}`, { lessons: ['lesson-1'] });
    }

    it.each([
      { dates: [], expected: 0 },
      { dates: ['2026-11-16'], expected: 1 },
      { dates: ['2026-11-15'], expected: 1 },
      { dates: ['2026-11-16', '2026-11-15'], expected: 2 },
      { dates: ['2026-11-15', '2026-11-14'], expected: 2 },
      { dates: ['2026-11-16', '2026-11-15', '2026-11-14', '2026-11-12'], expected: 3 },
      { dates: ['2026-11-16', '2026-11-14', '2026-11-13'], expected: 1 },
      { dates: ['2026-11-14', '2026-11-13'], expected: 0 },
    ])('counts $expected days for $dates, stopping at the first gap', async ({ dates, expected }) => {
      seed(dates);
      expect(await getStudyStreak('user-626', now)).toBe(expected);
    });

    it('bounds the query to 30 days, excluding future dates and other users', async () => {
      const dates = Array.from({ length: 35 }, (_, i) =>
        new Date(Date.parse('2026-11-16T00:00:00Z') - i * 86_400_000).toISOString().slice(0, 10));
      seed([...dates, '2026-11-17']);
      s.db.set('users/other/activity/2026-11-16', { lessons: ['lesson-2'] });
      expect(await getStudyStreak('user-626', now)).toBe(30);
      expect(s.queries).toEqual([{
        path: 'users/user-626/activity',
        filters: [['__name__', '>=', '2026-10-18'], ['__name__', '<=', '2026-11-16']],
      }]);
    });

    it('keeps yesterday’s streak at midnight MSK and extends it only after recorded activity', async () => {
      seed(['2026-11-15', '2026-11-16']);
      expect(await getStudyStreak('user-626', Date.parse('2026-11-16T20:59:59Z'))).toBe(2);
      const midnight = Date.parse('2026-11-16T21:00:00Z');
      expect(await getStudyStreak('user-626', midnight)).toBe(2);
      await recordDailyActivity('user-626', 'lesson-2', midnight);
      expect(await getStudyStreak('user-626', midnight)).toBe(3);
    });

    it('expires a streak at midnight MSK when the previous Moscow day has no activity', async () => {
      seed(['2026-11-14', '2026-11-15']);
      expect(await getStudyStreak('user-626', Date.parse('2026-11-16T20:59:59Z'))).toBe(2);
      expect(await getStudyStreak('user-626', Date.parse('2026-11-16T21:00:00Z'))).toBe(0);
    });
  });

  describe('completeLesson server action', () => {
    it('creates daily activity record at users/{uid}/activity/{YYYY-MM-DD} with firstAt and lessons arrayUnion', async () => {
      const todayMoscow = getMoscowDateString();
      await completeLesson('lesson-1', '/courses/course-test/lessons/1');

      // Verify progress doc is saved unchanged
      const progressDoc = s.db.get('users/user-626/progress/lesson-1');
      expect(progressDoc).toBeDefined();
      expect(progressDoc?.completed).toBe(true);
      expect(typeof progressDoc?.updatedAt).toBe('number');

      // Verify activity doc is created
      const activityDoc = s.db.get(`users/user-626/activity/${todayMoscow}`);
      expect(activityDoc).toBeDefined();
      expect(typeof activityDoc?.firstAt).toBe('number');
      expect(activityDoc?.lessons).toEqual(['lesson-1']);
      expect(s.revalidated).toContain('/courses/course-test/lessons/1');
    });

    it('does not overwrite firstAt on repeated lesson completion on the same day', async () => {
      const initialTimestamp = 1700000000000;
      const todayMoscow = getMoscowDateString(new Date(initialTimestamp));
      vi.spyOn(Date, 'now').mockReturnValue(initialTimestamp);

      await completeLesson('lesson-1', '/courses/course-test/lessons/1');

      const activityDoc1 = s.db.get(`users/user-626/activity/${todayMoscow}`);
      expect(activityDoc1?.firstAt).toBe(initialTimestamp);
      expect(activityDoc1?.lessons).toEqual(['lesson-1']);

      // Later on same day
      const laterTimestamp = initialTimestamp + 3600 * 1000;
      vi.spyOn(Date, 'now').mockReturnValue(laterTimestamp);

      await completeLesson('lesson-2', '/courses/course-test/lessons/2');

      const activityDoc2 = s.db.get(`users/user-626/activity/${todayMoscow}`);
      // firstAt MUST NOT be overwritten
      expect(activityDoc2?.firstAt).toBe(initialTimestamp);
      // lessons should include both lessons
      expect(activityDoc2?.lessons).toEqual(['lesson-1', 'lesson-2']);

      // Repeating the same lesson again does not duplicate in lessons arrayUnion
      await completeLesson('lesson-1', '/courses/course-test/lessons/1');
      const activityDoc3 = s.db.get(`users/user-626/activity/${todayMoscow}`);
      expect(activityDoc3?.firstAt).toBe(initialTimestamp);
      expect(activityDoc3?.lessons).toEqual(['lesson-1', 'lesson-2']);
    });

    it('preserves firstAt when two lessons are completed concurrently', async () => {
      const first = Date.parse('2026-11-16T12:00:00Z');
      await Promise.all([
        recordDailyActivity('user-626', 'lesson-1', first),
        recordDailyActivity('user-626', 'lesson-2', first + 1000),
      ]);
      expect(s.db.get('users/user-626/activity/2026-11-16')).toEqual({
        firstAt: first, lessons: ['lesson-1', 'lesson-2'],
      });
    });

    it('fills a missing firstAt while preserving other fields and a stored firstAt of zero', async () => {
      const timestamp = Date.parse('2026-11-16T12:00:00Z');
      const path = 'users/user-626/activity/2026-11-16';
      s.db.set(path, { lessons: ['lesson-1'], extra: 'keep' });
      await recordDailyActivity('user-626', 'lesson-2', timestamp);
      expect(s.db.get(path)).toEqual({ firstAt: timestamp, lessons: ['lesson-1', 'lesson-2'], extra: 'keep' });
      s.db.set(path, { ...s.db.get(path), firstAt: 0 });
      await recordDailyActivity('user-626', 'lesson-3', timestamp + 1000);
      expect(s.db.get(path)?.firstAt).toBe(0);
    });

    it('rejects a guest without writing progress or activity', async () => {
      s.session.mockResolvedValue(null);
      await expect(completeLesson('lesson-1', '/courses/course-test/lessons/1')).rejects.toThrow('unauthorized');
      expect(s.db.size).toBe(0);
      expect(s.revalidated).toEqual([]);
    });

    it('uses Europe/Moscow timezone for the activity document path', async () => {
      // 2026-11-16T20:59:59Z is 23:59:59 MSK -> 2026-11-16
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-16T20:59:59.000Z'));
      await completeLesson('lesson-late', '/courses/course-test/lessons/1');
      expect(s.db.get('users/user-626/activity/2026-11-16')?.lessons).toEqual(['lesson-late']);

      // 2026-11-16T21:00:00Z is 00:00:00 MSK (next day) -> 2026-11-17
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-16T21:00:00.000Z'));
      await completeLesson('lesson-midnight', '/courses/course-test/lessons/2');
      expect(s.db.get('users/user-626/activity/2026-11-17')?.lessons).toEqual(['lesson-midnight']);
    });

    it('does not fail lesson completion when activity recording throws an error', async () => {
      s.setFailActivity(true);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        completeLesson('lesson-1', '/courses/course-test/lessons/1'),
      ).resolves.not.toThrow();

      // Progress was still saved successfully
      const progressDoc = s.db.get('users/user-626/progress/lesson-1');
      expect(progressDoc?.completed).toBe(true);
      expect(s.revalidated).toContain('/courses/course-test/lessons/1');

      // Error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});

function assertReloadedCompletion(text: string) {
  expect(text).toContain('Пройдено');
  expect(text).not.toContain('Завтра продолжите со следующего урока');
}
