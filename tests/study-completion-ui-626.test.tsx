import { chromium, expect as dom, type Page } from '@playwright/test';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { readFile } from 'node:fs/promises';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

type CompletionProps = {
  courseId: string; lessonId: string; path: string; completed: boolean;
  streakDays: number; hasNextLesson: boolean;
};
type StudyWindow = {
  mount: (props: CompletionProps) => void;
  finishCompletion: (streakDays: number) => void;
  events: [string, Record<string, unknown>][];
  calls: [string, string][];
};
const initial: CompletionProps = {
  courseId: 'course-test', lessonId: 'lesson-1', path: '/courses/course-test/lessons/1',
  completed: false, streakDays: 1, hasNextLesson: true,
};

let browser: Awaited<ReturnType<typeof chromium.launch>>;
let app: string;
let css: string;
let page: Page;

beforeAll(async () => {
  // Bundle only this component in memory. Server actions and analytics are local boundaries.
  const bundle = await build({
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"test"' },
    plugins: [{ name: 'isolated-study-boundaries', setup(builder) {
      builder.onResolve({ filter: /^@\/app\/.*\/actions$/ }, args => ({ path: args.path, namespace: 'study-action' }));
      builder.onLoad({ filter: /.*/, namespace: 'study-action' }, () => ({
        contents: 'export const completeLesson = (lessonId, path) => window.completeAction(lessonId, path);',
      }));
      builder.onResolve({ filter: /^@\/lib\/analytics\/track-client$/ }, args => ({ path: args.path, namespace: 'study-track' }));
      builder.onLoad({ filter: /.*/, namespace: 'study-track' }, () => ({
        contents: 'export const track = (event, props) => window.events.push([event, props]);',
      }));
    } }],
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { flushSync } from 'react-dom';
      import { CompleteLessonButton } from './src/components/complete-lesson-button';
      const root = createRoot(document.getElementById('root'));
      let props;
      let resolveAction;
      window.events = [];
      window.calls = [];
      const render = () => flushSync(() => root.render(<CompleteLessonButton key={props.lessonId} {...props} />));
      window.mount = nextProps => { props = nextProps; render(); };
      window.completeAction = async (lessonId, path) => {
        window.calls.push([lessonId, path]);
        await new Promise(resolve => { resolveAction = resolve; });
      };
      // Model the updated RSC props returned by revalidatePath, before the action resolves.
      window.finishCompletion = streakDays => {
        props = { ...props, completed: true, streakDays };
        render();
        resolveAction();
      };
    ` },
  });
  app = bundle.outputFiles[0].text;
  css = (await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), {
    from: 'src/app/globals.css',
  })).css;
  browser = await chromium.launch({ channel: 'chromium' });
}, 30_000);

afterEach(async () => { await page?.close(); });
afterAll(async () => { await browser?.close(); });

async function mount(props: Partial<CompletionProps> = {}) {
  await page.evaluate(props => (window as unknown as StudyWindow).mount(props), { ...initial, ...props });
}
async function finish(streakDays: number) {
  await page.evaluate(streakDays => (window as unknown as StudyWindow).finishCompletion(streakDays), streakDays);
}

describe.each([390, 1280])('lesson completion at viewport width %s', width => {
  beforeEach(async () => {
    page = await browser.newPage({ viewport: { width, height: 844 } });
    page.setDefaultTimeout(4000);
    // Fulfil or abort every browser request locally; no live Firebase or PostHog calls.
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'study.test') return route.abort();
      if (url.pathname === '/app.js') return route.fulfill({ contentType: 'text/javascript', body: app });
      if (url.pathname === '/style.css') return route.fulfill({ contentType: 'text/css', body: css });
      if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body:
        '<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body style="padding:24px"><div id="root"></div><script src="/app.js"></script></body></html>' });
      return route.abort();
    });
    await page.goto('http://study.test/');
    await page.waitForFunction(() => typeof (window as unknown as StudyWindow).mount === 'function');
  });

  it('shows the data count and reminder only after a successful click, keeping lesson_completed properties', async () => {
    await mount();
    const button = page.getByRole('button', { name: 'Урок пройден', exact: true });
    await button.click();
    await dom(button).toBeDisabled();
    await dom(page.getByText('Вы учитесь')).toHaveCount(0);
    await dom(page.getByText('Завтра продолжите', { exact: false })).toHaveCount(0);
    await finish(2);
    await dom(page.getByText('Пройдено', { exact: true })).toBeVisible();
    await dom(page.getByText('Вы учитесь 2 дня подряд', { exact: true })).toBeVisible();
    await dom(page.getByText('Завтра продолжите со следующего урока', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as StudyWindow).events)).toEqual([
      ['lesson_completed', { courseId: 'course-test', lessonId: 'lesson-1' }],
    ]);
    expect(await page.evaluate(() => (window as unknown as StudyWindow).calls)).toEqual([
      ['lesson-1', '/courses/course-test/lessons/1'],
    ]);
    const lines = await page.locator('#root p').all();
    for (const line of lines) {
      const box = await line.boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    if (process.env.STUDY_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.STUDY_SCREENSHOT_DIR}/completion-${width}.png` });

    await page.reload();
    await page.waitForFunction(() => typeof (window as unknown as StudyWindow).mount === 'function');
    await mount({ completed: true, streakDays: 2 });
    await dom(page.getByText('Вы учитесь 2 дня подряд', { exact: true })).toBeVisible();
    await dom(page.getByText('Завтра продолжите', { exact: false })).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as StudyWindow).events)).toEqual([]);
  });

  it('hides the reminder after completing the last published lesson and when switching lessons', async () => {
    await mount({ lessonId: 'lesson-3', path: '/courses/course-test/lessons/3', hasNextLesson: false });
    await page.getByRole('button', { name: 'Урок пройден', exact: true }).click();
    await finish(3);
    await dom(page.getByText('Пройдено', { exact: true })).toBeVisible();
    await dom(page.getByText('Завтра продолжите', { exact: false })).toHaveCount(0);
    await mount({ completed: true, streakDays: 3 });
    await dom(page.getByText('Пройдено', { exact: true })).toBeVisible();
    await dom(page.getByText('Завтра продолжите', { exact: false })).toHaveCount(0);
  });
});
