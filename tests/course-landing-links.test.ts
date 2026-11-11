import { Children, isValidElement, type ReactNode } from 'react';
import Link from 'next/link';
import { describe, expect, it, vi } from 'vitest';
import CourseLandingPage from '@/app/(app)/courses/[courseSlug]/page';
import { VibeGuestCta } from '@/components/vibe-guest-cta';

// Каталог на границе ошибки: урок 1 хаба снят с публикации, введение агентов
// открыто. Номера опубликованных уроков сохраняются после фильтрации в db/courses.
const { catalog } = vi.hoisted(() => ({
  catalog: [
    { slug: 'vibecoding', lessons: [{ number: 1, access: 'paid' }] },
    { slug: 'it-vibecoding', lessons: [{ number: 1, access: 'paid' }] },
    { slug: 'claude-code-agents', lessons: [{ number: 1, access: 'free' }, { number: 2, access: 'paid' }] },
    { slug: 'ai-cartoons', lessons: [] },
    { slug: 'claude-code', lessons: [2, 3, 4, 5].map((number) => ({ number, access: 'free' })) },
  ].map((course) => ({
    ...course, id: `id-${course.slug}`, title: course.slug, description: '',
    isTest: course.slug === 'ai-cartoons', published: true,
    lessons: course.lessons.map((lesson) => ({ ...lesson, title: `Урок ${lesson.number}`, description: '' })),
  })),
}));

vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => catalog }));
vi.mock('@/lib/session', () => ({ getSession: async () => null }));
vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/components/payment/course-buy-button', () => ({ CourseBuyButton: () => null }));
vi.mock('@/components/payment/tariff-cards', () => ({ TariffCards: () => null }));
vi.mock('@/components/lead-capture', () => ({ LeadCapture: () => null }));

// Вызываем async-функцию страницы и проверяем её JSX; React-рендерер async RSC
// не запускаем. Раскрываем также настоящий дочерний CTA лендинга вайбкодинга.
function lessonHrefs(node: ReactNode): string[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ href?: string; children?: ReactNode }>(child)) return [];
    if (child.type === VibeGuestCta) return lessonHrefs(VibeGuestCta());
    const { href, children } = child.props;
    const link = (child.type === Link || child.type === 'a') && href?.match(/^\/courses\/[^/]+\/lessons\//);
    return [...(link ? [href!] : []), ...lessonHrefs(children)];
  });
}

async function landingHrefs(courseSlug: string) {
  return lessonHrefs(await CourseLandingPage({
    params: Promise.resolve({ courseSlug }), searchParams: Promise.resolve({}),
  }));
}

describe('ссылки бесплатных уроков на лендингах', () => {
  it.each(catalog.map((course) => course.slug))('%s: каждый предлагаемый урок существует и бесплатен', async (slug) => {
    const hrefs = await landingHrefs(slug);
    // У этих двух лендингов нет отдельного CTA бесплатного урока.
    expect(hrefs).toHaveLength(['ai-cartoons', 'claude-code'].includes(slug) ? 0 : 1);
    for (const href of hrefs) {
      const url = new URL(href, 'https://gelato.education');
      const [, , targetSlug, , number] = url.pathname.split('/');
      const target = catalog.find((course) => course.slug === targetSlug && course.published);
      const lesson = target?.lessons.find((lesson) => lesson.number === Number(number));
      expect(lesson, `${slug} → ${href}`).toBeDefined();
      expect(lesson?.access).toBe('free');
      expect(url.searchParams.get('from')).toBe(slug === 'claude-code-agents' ? 'course_landing' : 'vibe_landing');
    }
  });

  it('берёт номер первого бесплатного урока из данных текущего курса', async () => {
    const course = catalog.find((course) => course.slug === 'claude-code-agents')!;
    const original = course.lessons;
    course.lessons = [{ number: 2, access: 'paid' }, { number: 5, access: 'free' }, { number: 7, access: 'free' }]
      .map((lesson) => ({ ...original[0], ...lesson }));
    try {
      expect(await landingHrefs(course.slug)).toEqual(['/courses/claude-code-agents/lessons/5?from=course_landing']);
      course.lessons = [];
      expect(await landingHrefs(course.slug)).toEqual([]);
    } finally {
      course.lessons = original;
    }
  });
});
