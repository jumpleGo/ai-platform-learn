import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BlogPostPage from '@/app/(app)/blog/[slug]/page';
import { BLOG_POSTS } from '@/lib/blog';
import * as blog from '@/lib/blog';
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

async function pageHtml(slug: string): Promise<string> {
  // Resolve the async page first; Vitest renders only the resulting synchronous tree.
  return renderToStaticMarkup(await BlogPostPage({ params: Promise.resolve({ slug }) }));
}

async function startHere(slug: string): Promise<string> {
  const html = await pageHtml(slug);
  const section = html.match(/<section\b[^>]*aria-labelledby="post-start"[\s\S]*?<\/section>/)?.[0];
  expect(section, `Блок «С чего начать» в /blog/${slug}`).toBeDefined();
  return section!;
}

let catalog: CourseWithLessons[];
beforeEach(() => {
  vi.mocked(getPublishedCoursesWithLessons).mockReset();
  catalog = [
    course('claude-code-agents', 7), course('claude-code', 5), course('vibecoding', 4),
    course('ai-cartoons', 6),
  ];
  vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue(catalog);
});
afterEach(() => vi.restoreAllMocks());

describe('блок «С чего начать» в шаблоне статьи', () => {
  it('берёт курс из ссылки в статье и первый опубликованный бесплатный урок из данных', async () => {
    catalog[0].lessons.reverse();
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

  it('без связки выбирает курс по теме и его вводный урок', async () => {
    const html = await startHere('kakuyu-neyroset-vybrat');
    expect(html).toContain('href="/courses/claude-code"');
    expect(html).toContain('href="/courses/claude-code/lessons/5"');
    expect(html).not.toContain('href="/courses"');
  });

  it('при пустом каталоге сохраняет рендер статьи без битых CTA', async () => {
    vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue([]);
    const html = await pageHtml('ii-agent-prostymi-slovami');
    expect(html).toContain('<article');
    expect(html).not.toContain('aria-labelledby="post-start"');
  });

  it.each(['unpublished', 'test', 'no-free'])('исключает недоступный связанный курс: %s', async (state) => {
    if (state === 'unpublished') catalog[0].published = false;
    if (state === 'test') catalog[0].isTest = true;
    if (state === 'no-free') catalog[0].lessons = [lesson(1, 'free', false), lesson(2, 'paid')];
    const html = await startHere('ii-agent-prostymi-slovami');
    expect(html).toContain('href="/courses/claude-code"');
    expect(html).toContain('href="/courses/claude-code/lessons/5"');
    expect(html).not.toContain('/courses/claude-code-agents');
  });

  it.each([
    ['Как сделать видео с ИИ', undefined, 'ai-cartoons', 6],
    ['Первый сайт с ИИ', undefined, 'vibecoding', 4],
    ['Новый инструмент', ['ИИ-агенты'], 'claude-code-agents', 7],
    ['Обзор нового инструмента', undefined, 'claude-code-agents', 7],
  ] as const)('новая автостатья без связки получает курс и урок: %s', async (title, tags, key, number) => {
    vi.spyOn(blog, 'getBlogPost').mockReturnValue({
      ...BLOG_POSTS[0], slug: 'future-auto-article', title, topic: '',
      body: 'Новая статья gelato-blog без внутренних ссылок.', lessonPath: null,
      ...(tags ? { tags } : {}),
    });
    const html = await startHere('future-auto-article');
    expect(html).toContain(`href="/courses/${key}"`);
    expect(html).toContain(`href="/courses/${key}/lessons/${number}"`);
    expect(html).not.toContain('href="/courses"');
    catalog.reverse();
    expect(await startHere('future-auto-article')).toBe(html);
  });

  it('≥90% фактических статей ссылаются на конкретный курс и его первый открытый урок', async () => {
    const results = await Promise.all(BLOG_POSTS.map(async (post) => {
      const html = await startHere(post.slug);
      const covered = catalog.some((course) => {
        const first = course.lessons.filter((lesson) => lesson.access === 'free' && lesson.published !== false)
          .sort((a, b) => a.number - b.number)[0];
        return first && html.includes(`href="/courses/${course.slug}"`)
          && html.includes(`href="/courses/${course.slug}/lessons/${first.number}"`);
      });
      return { slug: post.slug, covered };
    }));
    const covered = results.filter((result) => result.covered).length;
    console.info(`BLOG_START_HERE_COVERAGE=${covered}/${BLOG_POSTS.length}`);
    expect(covered, JSON.stringify(results.filter((result) => !result.covered)))
      .toBeGreaterThanOrEqual(Math.ceil(BLOG_POSTS.length * 0.9));
  });
});
