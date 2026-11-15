/// <reference types="vite/client" />
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as llms } from '@/app/llms.txt/route';
import { getPublishedCoursesWithLessons, type CourseWithLessons } from '@/lib/db/courses';
import { proxy } from '@/proxy';

vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn() }));

// На старом коде маршрут отсутствует: тест должен показать это утверждением,
// а проверка настоящего proxy отдельно фиксирует прежний 307 -> /login.
const fullRoutes = import.meta.glob('../src/app/llms-full.txt/route.ts', { eager: true });
const fullRoute = Object.values(fullRoutes)[0] as { GET: () => Response | Promise<Response> } | undefined;
const introUrl = 'https://gelato.education/courses/claude-code-agents/lessons/1';

beforeEach(() => {
  vi.mocked(getPublishedCoursesWithLessons).mockReset();
  vi.mocked(getPublishedCoursesWithLessons).mockResolvedValue([{
    id: 'hub', slug: 'claude-code', title: 'Материалы', isTest: false,
    lessons: [{ id: 'hub-2', number: 2, access: 'free', title: 'Урок', description: 'Описание' }],
  }, {
    id: 'agents', slug: 'claude-code-agents', title: 'Claude Code с нуля', isTest: false,
    lessons: [{ id: 'intro', number: 1, access: 'free' }, { id: 'paid', number: 2, access: 'paid' }],
  }] as CourseWithLessons[]);
});

function guestRequest(path: string) {
  return new NextRequest(`https://gelato.education${path}`, { headers: { cookie: 'vid=geo-test-216' } });
}

describe('GEO: публичные текстовые карты сайта', () => {
  it('llms.txt содержит одну ссылку на бесплатное вступление с простым описанием', async () => {
    const response = await llms();
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    const introLines = text.split('\n').filter((line) => line.includes(introUrl));
    expect(introLines).toHaveLength(1);
    expect(introLines[0]).toContain('Бесплатный вводный урок для тех, кто ещё не работал с ИИ.');
    expect(introLines[0]).toContain('без опыта программирования');
    expect(introLines[0]).not.toMatch(/промпт|вайбкод|MCP|скилл|токен|бесплатн\S* курс/i);
    expect(text).toContain('https://gelato.education/courses/claude-code/lessons/2');
    expect(text).not.toContain('https://gelato.education/courses/claude-code-agents/lessons/2');
  });

  it.each(['/llms-full.txt', '/llms-full.txt?utm_source=geo'])('%s проходит через proxy без сессии и редиректа', (path) => {
    const response = proxy(guestRequest(path));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('llms-full.txt отдаёт публичный текст и реальные цены без обращения к Firestore', async () => {
    expect(fullRoute, 'публичный текстовый маршрут отсутствует').toBeDefined();
    const response = await fullRoute!.GET();
    const text = (await response.text()).replace(/[\u00a0\u202f]/g, ' ');
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(text).toContain(introUrl);
    expect(text).toContain('Бесплатный вводный урок');
    expect(text).toContain('7 990–27 990 ₽');
    expect(text).toContain('https://gelato.education/courses/vibecoding');
    expect(text).toContain('https://gelato.education/courses/ai-cartoons');
    expect(text).not.toMatch(/<html|бесплатн\S* курс|\/login|PRIVATE_LESSON_BODY/i);
    expect(getPublishedCoursesWithLessons).not.toHaveBeenCalled();
  });

  it.each(['/admin', '/profile', '/settings', '/llms-full.txt/private', '/llms-full.txt.bak', '/llms-private.txt'])('%s сохраняет прежний редирект гостя на /login', (path) => {
    const response = proxy(guestRequest(path));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://gelato.education/login');
  });
});
