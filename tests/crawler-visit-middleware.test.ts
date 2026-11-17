import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';
import {
  BASELINE_COOKIE,
  BASELINE_HEADERS,
  BASELINE_NEW_VID_HEADERS,
  BASELINE_STATUS,
  BASELINE_UUID,
} from './fixtures/proxy-baseline-716';

const BOTS = [
  ['GPTBot', 'Mozilla/5.0 AppleWebKit/537.36; compatible; GPTBot/1.1; +https://openai.com/gptbot'],
  ['ClaudeBot', 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'],
  ['PerplexityBot', 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)'],
  ['Google-Extended', 'Mozilla/5.0 (compatible; Google-Extended)'],
] as const;
const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

function run(ua: string, path = '/blog/test', cookie?: string) {
  const waits: Promise<unknown>[] = [];
  const event = { waitUntil: (p: Promise<unknown>) => { waits.push(p); } } as never;
  const headers: Record<string, string> = { 'user-agent': ua };
  if (cookie) headers.cookie = cookie;
  const req = new NextRequest(`https://gelato.education${path}`, { headers });
  const res = proxy(req, event);
  return { req, res, event, waits };
}

const sortedHeaders = (res: Response) =>
  [...res.headers.entries()].map(([k, v]): [string, string] => [k, v.replace(/; Expires=[^;]+/, '')]).sort();

describe('crawler_visit в middleware (#689)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-key');
    fetchMock = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

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

  it.each([['браузер', BROWSER], ['бот', BOTS[0][1]]])(
    'ответ proxy (%s) совпадает с прежним proxy: статус, переходы, полный набор заголовков',
    (_who, ua) => {
      const { res } = run(ua, '/llms.txt', BASELINE_COOKIE);
      expect(res.status).toBe(BASELINE_STATUS);
      expect(res.headers.get('location')).toBeNull();
      expect(sortedHeaders(res)).toEqual(BASELINE_HEADERS(ua));
    },
  );

  it('ответ для нового посетителя совпадает с прежним proxy (uuid зафиксирован)', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(BASELINE_UUID);
    const { res } = run(BOTS[0][1], '/llms.txt');
    expect(res.status).toBe(BASELINE_STATUS);
    expect(sortedHeaders(res)).toEqual(BASELINE_NEW_VID_HEADERS(BOTS[0][1]));
  });

  it('отказ fetch: ответ тот же, что у прежнего proxy, и не падает', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    const { res, waits } = run(BOTS[0][1], '/llms.txt', BASELINE_COOKIE);
    await expect(Promise.all(waits)).resolves.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(BASELINE_STATUS);
    expect(sortedHeaders(res)).toEqual(BASELINE_HEADERS(BOTS[0][1]));
  });

  it('другие пути не дают события', () => {
    const { waits } = run(BOTS[0][1], '/courses');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(waits).toHaveLength(0);
  });

  it('/blog/* даёт событие', async () => {
    const { waits } = run(BOTS[0][1], '/blog/test');
    await Promise.all(waits);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
