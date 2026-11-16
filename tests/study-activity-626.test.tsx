import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompleteLessonButton } from '@/components/complete-lesson-button';
import { completeLesson } from '@/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions';

const s = vi.hoisted(() => {
  const db = new Map<string, Record<string, any>>();
  const revalidated: string[] = [];
  let shouldFailActivity = false;

  return {
    db,
    revalidated,
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
  FieldValue: {
    arrayUnion: (...elements: unknown[]) => ({ _type: 'arrayUnion', elements }),
    increment: (n: number) => ({ _type: 'increment', n }),
  },
}));
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
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
    s.setFailActivity(false);
    s.session.mockResolvedValue({ uid: 'user-626', email: 'user@example.com' });
    vi.restoreAllMocks();
  });

  describe('CompleteLessonButton UI', () => {
    it('renders soft reminder without numbers under "Пройдено" when completed is true', () => {
      const html = renderToStaticMarkup(
        <CompleteLessonButton
          courseId="course-test"
          lessonId="lesson-1"
          path="/courses/course-test/lessons/1"
          completed={true}
        />,
      );

      expect(html).toContain('Пройдено');
      const reminder = 'Отлично! Завтра продолжите со следующего урока';
      expect(html).toContain(reminder);
      // Ensure the reminder string contains no digits/numbers
      expect(reminder).not.toMatch(/[0-9]/);
      // Ensure reminder is placed under "Пройдено"
      expect(html.indexOf('Пройдено')).toBeLessThan(html.indexOf(reminder));
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
