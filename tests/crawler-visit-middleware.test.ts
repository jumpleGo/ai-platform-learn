import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { config, middleware } from '@/middleware';

const BOTS = [
  ['GPTBot', 'Mozilla/5.0 AppleWebKit/537.36; compatible; GPTBot/1.1; +https://openai.com/gptbot'],
  ['ClaudeBot', 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'],
  ['PerplexityBot', 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)'],
  ['Google-Extended', 'Mozilla/5.0 (compatible; Google-Extended)'],
] as const;
const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

function run(ua: string, path = '/blog/test') {
  const waits: Promise<unknown>[] = [];
  const event = { waitUntil: (p: Promise<unknown>) => { waits.push(p); } } as never;
  const res = middleware(new NextRequest(`https://gelato.education${path}`, { headers: { 'user-agent': ua } }), event);
  return { res, waits };
}

describe('crawler_visit в middleware (#689)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-key');
    fetchMock = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it.each(BOTS)('%s даёт событие', async (name, ua) => {
    const { waits } = run(ua, '/llms.txt');
    await Promise.all(waits);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.event).toBe('crawler_visit');
    expect(body.properties).toMatchObject({ path: '/llms.txt', ua_family: 'ai_crawler' });
    expect(body.properties.bot_name).toBe(name.toLowerCase());
  });

  it('обычный браузер не даёт события', () => {
    const { waits } = run(BROWSER);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(waits).toHaveLength(0);
  });

  it('ответ равен NextResponse.next()', () => {
    for (const ua of [BROWSER, BOTS[0][1]]) {
      const { res } = run(ua);
      expect(res.headers.get('x-middleware-next')).toBe('1');
      expect(res.headers.get('location')).toBeNull();
      expect([...res.headers.keys()]).toEqual(['x-middleware-next']);
    }
  });

  it('сбой fetch не роняет ответ', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    const { res, waits } = run(BOTS[1][1]);
    await expect(Promise.all(waits)).resolves.toBeDefined();
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('matcher только для /llms.txt и /blog', () => {
    expect(config.matcher).toEqual(['/llms.txt', '/blog/:path*']);
  });
});
