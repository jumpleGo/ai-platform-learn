import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BlogPostPage from '@/app/(app)/blog/[slug]/page';
import { BLOG_POSTS } from '@/lib/blog';
import { getPublishedCoursesWithLessons, type CourseWithLessons, type NumberedLesson } from '@/lib/db/courses';

vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn() }));

function lesson(number: number, access: 'free' | 'paid', published = true): NumberedLesson {
  return {
    id: `lesson-${number}`, courseId: 'course-id', number, order: number,
    title: 'Урок', description: '', access, published, videoEmbedUrl: '',
    durationSec: null, materials: '', views: 0, previewImageUrl: null, coverCaption: null,
    hideHeader: false, hideFooter: false, hideBackLink: false, hideLessonsNav: false,
    marketingVariants: [], relatedVariants: [], marketingHtml: null, relatedHtml: null,
  };
}

function course(slug: string, firstFreeNumber: number): CourseWithLessons {
  return {
    id: `${slug}-id`, slug, title: 'Курс по теме статьи', description: '', coverUrl: null,
    order: 0, published: true, access: 'paid', isTest: false,
    testToastMessage: null, testLandingHtml: null, showBadge: false, badgeText: null,
    highlightBackground: false, clickCount: 0,
    lessons: [lesson(1, 'free', false), lesson(2, 'paid'), lesson(firstFreeNumber, 'free'), lesson(firstFreeNumber + 1, 'free')],
  };
}

async function startHere(slug: string): Promise<string> {
  // Resolve the async page first; Vitest renders only the resulting synchronous tree.
  const html = renderToStaticMarkup(await BlogPostPage({ params: Promise.resolve({ slug }) }));
  const section = html.match(/<section\b[^>]*aria-labelledby="post-start"[\s\S]*?<\/section>/)?.[0];
  expect(section, `Блок «С чего начать» в /blog/${slug}`).toBeDefined();
  return section!;
}

beforeEach(() => {
  vi.mocked(getPublishedCoursesWithLessons).mockReset();
  vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue([
    course('claude-code-agents', 7), course('claude-code', 5), course('vibecoding', 4),
  ]);
});

describe('блок «С чего начать» в шаблоне статьи', () => {
  it('берёт курс из ссылки в статье и первый опубликованный бесплатный урок из данных', async () => {
    const html = await startHere('ii-agent-prostymi-slovami');
    expect(html).toContain('С чего начать');
    expect(html).toContain('href="/courses/claude-code-agents"');
    expect(html).toContain('href="/courses/claude-code-agents/lessons/7"');
    expect(html).not.toMatch(/\/lessons\/(1|2|8)"/);
    expect(html).not.toMatch(/бесплатн\S*\s+курс|₽|рубл/i);
  });

  it('для связки с уроком ведёт на вводный урок того же курса', async () => {
    const html = await startHere('promt-inzhiniring-prostymi-slovami');
    expect(html).toContain('href="/courses/claude-code"');
    expect(html).toContain('href="/courses/claude-code/lessons/5"');
    expect(html).not.toContain('/lessons/2');
  });

  it('без связки предлагает каталог /courses', async () => {
    const html = await startHere('kakuyu-neyroset-vybrat');
    expect(html).toContain('href="/courses"');
    expect(html).not.toContain('/lessons/');
    expect(getPublishedCoursesWithLessons).not.toHaveBeenCalled();
  });

  it('если связанный курс снят с публикации, предлагает каталог', async () => {
    vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue([]);
    const html = await startHere('ii-agent-prostymi-slovami');
    expect(html).toContain('href="/courses"');
    expect(html).not.toContain('/courses/claude-code-agents');
  });

  it('если бесплатного урока нет, оставляет только лендинг курса', async () => {
    const related = course('claude-code-agents', 7);
    related.lessons = [lesson(1, 'free', false), lesson(2, 'paid')];
    vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue([related]);
    const html = await startHere('ii-agent-prostymi-slovami');
    expect(html).toContain('href="/courses/claude-code-agents"');
    expect(html).not.toContain('/lessons/');
  });

  it.each(BLOG_POSTS.map((post) => post.slug))('рендерит блок со ссылкой на курсы: %s', async (slug) => {
    expect(await startHere(slug)).toMatch(/href="\/courses(?:\/|"|\?)/);
  });
});
