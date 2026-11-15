import { createHash } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  AGENTS_INTRO_LESSON, SITE_URL, STANDALONE_FREE_LESSONS,
  getLessonSeoContent, getStandaloneFreeLesson, standaloneFreeLessonPath,
} from '@/lib/free-lessons';
import { lessonPath } from '@/lib/slug';
import StandaloneFreeLessonPage, {
  generateMetadata, generateStaticParams,
} from '@/app/(app)/free/[slug]/page';
import FreePage from '@/app/(app)/free/page';
import sitemap from '@/app/sitemap';

// Каталог проверяем с пустой БД: самостоятельный урок не требует записи курса.
vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

const NEW_SLUG = 'gstack-praktikum';
const README = 'https://github.com/garrytan/gstack/blob/3b650356f3d711caca98713475dd6085b15c5996/README.md';

// Минимальная замороженная фикстура из main: только слаги и происхождение.
// src/lib/free-lessons.ts прочитан при подготовке; git и origin в тесте не нужны.
const MAIN_FREE_LESSONS = Object.freeze({
  commit: '56c7582e2f01ee37eb47222956c2a1bab47b27c1',
  sourceSha256: 'e49c11378792d28b8e6e63750acba3c19c5b1d79636076bd2fbd837a2b9fd5de',
  slugs: Object.freeze([
    'claude-code/lessons/1',
    'claude-code/lessons/2',
    'claude-code/lessons/3',
    'claude-code/lessons/4',
    'claude-code/lessons/5',
    'claude-code-agents/lessons/1',
  ]),
});

// Замороженные разделы старого текста урока c53a38a до правок B01 и B02 (#572).
const OLD_PRACTIKUM_FIXTURE = Object.freeze({
  commit: 'c53a38afeec5ee6ad5c8ecf5f6868886a474975b',
  sourceSha256: 'afd4225c2e78a30ca0f70d1ae74e31dcaa010f259ce6d7f9814888c3ef62b129',
  combinedSha256: '11c58961060e1312b0efc5b381b7f9d10e8e9ac9af63c736453a117208b2177a',
  text: `## Сначала проверьте среду

Начните с проверки установки. Для gstack в README перечислены Claude Code, Git и Bun. Для Bun указана проверенная версия v1.4.2 или новее; установка отказывает при версии ниже 1.3.3. На Windows дополнительно нужен Node.js. Минимальную версию Node.js этот README не задаёт. [Источник: Requirements, строка 32](https://github.com/garrytan/gstack/blob/3b650356f3d711caca98713475dd6085b15c5996/README.md#L32).

macOS и Linux имеют полную поддержку. Для Windows автор обещает установку и основные команды, а не все возможности. На Windows 11 нужны Git Bash или WSL; команды bun и node должны быть доступны в выбранной среде. В README это названо «на PATH». [Источник: Platform notes, строки 241–247](https://github.com/garrytan/gstack/blob/3b650356f3d711caca98713475dd6085b15c5996/README.md#L241).

Откройте Claude Code в отдельной папке для учебной работы. Включите секундомер и заведите заметку «Ход практикума»: записывайте сделанное, ошибки и время до первого работающего результата. Текст в рамках дальше можно копировать в чат. Сначала отправьте:

\`\`\`text
Помоги проверить готовность к установке gstack.
Определи мою операционную систему. Проверь наличие Claude Code, Git и Bun.
Сравни Bun с требованиями: проверенная версия v1.4.2+, отказ установки ниже 1.3.3.
Если это Windows, проверь также Node.js и доступность bun и node в Git Bash или WSL.
Пока ничего не устанавливай. Покажи, что уже готово, чего не хватает и что нужно сделать.
Объясняй каждое действие обычными словами.
\`\`\`

Сам gstack бесплатный и открытый, с лицензией MIT. Это утверждение относится к gstack. [Источник: README, строка 318](https://github.com/garrytan/gstack/blob/3b650356f3d711caca98713475dd6085b15c5996/README.md#L318).

## Шаг 2. /review — проверьте изменения

В README \`/review\` запускают в ветке с изменениями. Команда ищет ошибки и исправляет очевидные. [Источник: Quick start и описание роли, строки 25 и 155](https://github.com/garrytan/gstack/blob/3b650356f3d711caca98713475dd6085b15c5996/README.md#L155).

Оставайтесь в том же проекте и отправьте:

\`\`\`text
/review
Проверь изменения страницы «Список покупок» по согласованному документу.
Для каждого замечания объясни, какое действие пользователя сломается.
После исправления покажи, какая проверка подтверждает результат.
Сохрани краткий итог в review.md: замечание, исправление, проверка.
Если замечаний нет, так и напиши.
\`\`\`

Прочитайте итог. Вместо непонятного объяснения попросите пример: «Что я увижу на странице, если это не исправить?» Повторите добавление «Молока» и отметку о покупке.

**Наглядный результат:** \`review.md\` с результатом проверки и снимок страницы после исправлений. Если замечаний нет, сохраните этот честный итог: придумывать найденную ошибку не нужно.`,
});

function hasPracticum(slugs: readonly string[]): boolean {
  return slugs.includes(NEW_SLUG);
}

function checkNodeStep(body: string): boolean {
  return body.includes('node -v') && body.includes('Team mode');
}

function checkCodexOptional(body: string): boolean {
  return body.includes('Codex необязателен') && body.includes('codex_reviews disabled');
}

function pageProps(slug = NEW_SLUG) {
  return { params: Promise.resolve({ slug }) };
}

describe('самостоятельный бесплатный практикум gstack #572', () => {
  it('есть в опубликованном списке и имеет отдельный адрес', () => {
    const published = STANDALONE_FREE_LESSONS.filter((lesson) => lesson.published);
    expect(hasPracticum(published.map((lesson) => lesson.slug))).toBe(true);
    expect(published.filter((lesson) => lesson.slug === NEW_SLUG)).toHaveLength(1);
    expect(getStandaloneFreeLesson(NEW_SLUG)).toMatchObject({ slug: NEW_SLUG, published: true });
    expect(standaloneFreeLessonPath(NEW_SLUG)).toBe('/free/gstack-praktikum');
  });

  it('тот же критерий отклоняет замороженный список main без практикума', () => {
    expect(hasPracticum(MAIN_FREE_LESSONS.slugs)).toBe(false);
  });

  it('сохраняет каждый прежний адрес из main и вводный урок', () => {
    const currentSlugs = MAIN_FREE_LESSONS.slugs.flatMap((slug) => {
      const [courseSlug, lessonNumber] = slug.split('/lessons/');
      const number = Number(lessonNumber);
      return getLessonSeoContent(courseSlug, number)
        ? [lessonPath(courseSlug, number).slice('/courses/'.length)]
        : [];
    });
    expect(currentSlugs).toEqual(MAIN_FREE_LESSONS.slugs);
    expect(lessonPath(AGENTS_INTRO_LESSON.courseSlug, AGENTS_INTRO_LESSON.number))
      .toBe('/courses/claude-code-agents/lessons/1');
  });

  it('ссылается в самом тексте на README с заданным полным коммитом', () => {
    expect(getStandaloneFreeLesson(NEW_SLUG)?.body ?? '')
      .toContain(`[README gstack, коммит 3b650356f3d711caca98713475dd6085b15c5996](${README})`);
  });

  it('отдаёт параметры страницы и canonical нового адреса', async () => {
    expect(generateStaticParams()).toContainEqual({ slug: NEW_SLUG });
    const metadata = await generateMetadata(pageProps());
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/free/gstack-praktikum`);
  });

  it('показывает текст, команды, источник и бесплатный учебный материал', async () => {
    // Вызываем обработчик и рендерим уже разрешённое дерево, без Next-сервера.
    const html = renderToStaticMarkup(await StandaloneFreeLessonPage(pageProps()));
    expect(html).toContain('<h1');
    expect(html).toContain(`href="${README}"`);
    expect(html).toContain('/office-hours');
    expect(html).toContain('/review');
    expect(html).toContain('/qa');
    expect(html).toContain('Введите название покупки');
    expect(html).toContain('"isAccessibleForFree":true');
  });

  it('доступен из /free и sitemap даже без уроков в БД', async () => {
    const html = renderToStaticMarkup(await FreePage({}));
    expect(html).toContain('href="/free/gstack-praktikum"');
    expect(html).not.toContain('Бесплатные уроки скоро появятся.');
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain(`${SITE_URL}/free/gstack-praktikum`);
  });

  it('возвращает 404 для отсутствующего самостоятельного урока', async () => {
    expect(getStandaloneFreeLesson('missing-practicum')).toBeNull();
    await expect(StandaloneFreeLessonPage(pageProps('missing-practicum')))
      .rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    await expect(generateMetadata(pageProps('missing-practicum')))
      .rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });

  it('в уроке есть шаг про Node и пометка, что Codex необязателен', () => {
    const body = getStandaloneFreeLesson(NEW_SLUG)?.body ?? '';
    expect(checkNodeStep(body)).toBe(true);
    expect(checkCodexOptional(body)).toBe(true);
  });

  it('падающая проверка на старом тексте урока (OLD_FAILS>0)', () => {
    expect(createHash('sha256').update(OLD_PRACTIKUM_FIXTURE.text).digest('hex'))
      .toBe(OLD_PRACTIKUM_FIXTURE.combinedSha256);
    let oldFails = 0;
    if (!checkNodeStep(OLD_PRACTIKUM_FIXTURE.text)) oldFails++;
    if (!checkCodexOptional(OLD_PRACTIKUM_FIXTURE.text)) oldFails++;
    console.log(`OLD_FAILS=${oldFails}`);
    expect(oldFails).toBe(2);
    expect(oldFails).toBeGreaterThan(0);
  });
});
