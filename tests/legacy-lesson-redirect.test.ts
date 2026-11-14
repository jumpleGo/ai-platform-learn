import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getRedirectUrl, unstable_getResponseFromNextConfig } from 'next/experimental/testing/server';
import nextConfig from '../next.config';
import before from './fixtures/legacy-lesson-response.json';

// Literal fields from the public GET on 2026-11-14; raw response stays in eval/.
// Source baseline: 770e389538119e511134c047e336647115621f17 (deployed SHA unknown).
// Fixture SHA-256: bb7aa415231f5bbaeccb6c77b788d4acde167edba20b83a2c3a979bad9890fe2
const destination = /content="0;url=([^"]+)"/.exec(before.metaRefresh)![1];

describe('legacy lesson HTTP redirect', () => {
  it('keeps the recorded 200 and literal refresh fixture frozen', () => {
    const raw = readFileSync(new URL('./fixtures/legacy-lesson-response.json', import.meta.url));
    expect(createHash('sha256').update(raw).digest('hex'))
      .toBe('bb7aa415231f5bbaeccb6c77b788d4acde167edba20b83a2c3a979bad9890fe2');
    expect(before.status).toBe(200);
    expect(before.location).toBeNull();
  });

  it.each(['', '?utm_source=legacy&from=gsc'])('returns 301 before rendering, query=%s', async (query) => {
    const response = await unstable_getResponseFromNextConfig({ url: before.url + query, nextConfig });
    expect(response.status).toBe(301);
    expect(getRedirectUrl(response)).toBe(new URL(destination + query, before.url).href);
    expect(await response.text()).not.toContain('http-equiv="refresh"');
  });

  it.each([
    destination,
    ...[2, 3, 4].map((n) => `/courses/claude-code/lessons/${n}`),
    new URL(before.url).pathname + '-unknown',
  ])('leaves %s to the application router', async (path) => {
    const response = await unstable_getResponseFromNextConfig({ url: new URL(path, before.url).href, nextConfig });
    expect(getRedirectUrl(response)).toBeNull();
  });
});
