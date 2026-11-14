import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getBlogPost } from '@/lib/blog';
import { getCourseLanding } from '@/lib/course-landings';

// Three frozen metadata excerpts from 9331f15, with each original file's SHA-256.
// Only title/description text is retained; replay never reads Git or remote refs.
const OLD_SNIPPETS = {
  "commit": "9331f15942313c056571b8473fef5fadc94988c7",
  "pages": [
    {
      "route": "/",
      "file": "src/app/gelateria/page.tsx",
      "sourceSha256": "a2af86326b488a193444322af23ba6320ce816adcedcffe6f70812144443d683",
      "snippet": "title: 'GELATO — обучение работе с ИИ: от нуля до своих ИИ-агентов',\n  description:\n    'Онлайн-школа GELATO: Claude Code с нуля для новичков без опыта, инженерный вайбкодинг для разработчиков и ИИ-мультфильмы. Бесплатные уроки, домашки с личной проверкой.',"
    },
    {
      "route": "/courses/vibecoding",
      "file": "src/lib/course-landings.ts",
      "sourceSha256": "aaa26723aa2d9aad4d587b4cb43b6793425abc968604fabfc867316d3b5a19ba",
      "snippet": "seoTitle: 'Инженерный вайбкодинг для разработчиков и вайбкодеров — GELATO',\n  seoDescription: 'Интенсив для разработчиков и опытных вайбкодеров: CLAUDE.md и rules, линтеры, типы, автотесты, свои агенты. ИИ пишет проверяемый код в вашем репозитории, а не плодит баги.',"
    },
    {
      "route": "/blog/ai-komanda-kak-realnaya-komanda",
      "file": "src/lib/blog.ts",
      "sourceSha256": "60c4e1cfc7093425b65e615a8a092dd4f8c6f65aa7bde303a06a142a875e158a",
      "snippet": "seoTitle: 'Команда ИИ-агентов для разработки: роли, пайплайн, ревью — GELATO',\n    seoDescription: 'Практика построения AI-команды: как распределить роли между агентами, зачем нужен тимлид-оркестратор, как агенты учатся на ошибках через black list и почему второй ревьюер должен быть на другой модели.',"
    }
  ]
} as const;

type Snippet = { route: string; title: string; description: string };

function property(source: string, name: string): string {
  const match = source.match(new RegExp("\\b" + name + ":\\s*(['\"])(.*?)\\1", 's'));
  if (!match) throw new Error('Missing metadata property: ' + name);
  return match[2];
}

function oldSnippets(): Snippet[] {
  return OLD_SNIPPETS.pages.map(({ route, snippet }) => ({
    route,
    title: property(snippet, route === '/' ? 'title' : 'seoTitle'),
    description: property(snippet, route === '/' ? 'description' : 'seoDescription'),
  }));
}

function currentSnippets(): Snippet[] {
  // Read the static export without executing the async home page or its services.
  const home = readFileSync(new URL('../src/app/gelateria/page.tsx', import.meta.url), 'utf8')
    .split('export const metadata: Metadata = {')[1]?.split('\n};')[0];
  if (!home) throw new Error('Home metadata export is missing');
  const course = getCourseLanding('vibecoding');
  const article = getBlogPost('ai-komanda-kak-realnaya-komanda');
  if (!course || !article) throw new Error('Target course or article is missing');
  return [
    { route: '/', title: property(home, 'title'), description: property(home, 'description') },
    { route: '/courses/vibecoding', title: course.seoTitle, description: course.seoDescription },
    {
      route: '/blog/ai-komanda-kak-realnaya-komanda',
      title: article.seoTitle,
      description: article.seoDescription,
    },
  ];
}

// Replay the required red baseline with the same assertions.
const snippets = process.env.SEO_SNIPPETS_465_OLD_FIXTURE === '1'
  ? oldSnippets()
  : currentSnippets();
const sentences = new Intl.Segmenter('ru', { granularity: 'sentence' });

describe('search snippets for task 465', () => {
  it('keeps the three original excerpts and their provenance frozen', () => {
    expect(createHash('sha256').update(JSON.stringify(OLD_SNIPPETS)).digest('hex'))
      .toBe('7d232be724f9b9945f6383ec7e2ca90af4011ea4084a6fec3216c620362d790a');
  });

  it.each(snippets)('$route: title fits within 60 Unicode characters', ({ title }) => {
    expect(title.trim()).not.toBe('');
    expect([...title].length).toBeLessThanOrEqual(60);
  });

  it.each(snippets)('$route: description is one complete sentence', ({ description }) => {
    expect(description.trim()).toMatch(/[.!?…]$/u);
    expect([...sentences.segment(description)].filter(({ segment }) => segment.trim()))
      .toHaveLength(1);
  });
});
