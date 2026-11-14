import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { NextConfig } from 'next';
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server';
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';
import { GET } from '@/app/llms-full.txt/route';
import { oldLlmsCourseLine, redirects } from './fixtures/vibecoding-c0a64cb5';

// Fixture SHA-256: 26f10bd270986b4ac1bcd3c77da3c45254aa57e9bc3c23a23a2aaab719148e6a
const source = '/courses/it-vibecoding';
const destination = '/courses/vibecoding';
const site = 'https://gelato.education';
const oldConfig: NextConfig = { redirects: async () => redirects.map((rule) => ({ ...rule })) };
// Replay the literal fixture against the same contract to record a real failing run.
const replayOld = process.env.VIBECODING_OLD_FIXTURE === '1';
const config = replayOld ? oldConfig : nextConfig;

async function expect301(nextConfig: NextConfig, query = '') {
  const response = await unstable_getResponseFromNextConfig({ url: site + source + query, nextConfig });
  expect(response.status).toBe(301);
  expect(response.headers.get('location')).toBe(site + destination + query);
}

function expectCanonical(text: string) {
  expect(text.includes('it-vibecoding'), 'llms-full.txt must not publish the legacy slug').toBe(false);
  expect(text).toContain(`${site}${destination}`);
}

describe('canonical vibecoding URL', () => {
  it('keeps the literal c0a64cb5 fixture frozen', () => {
    const raw = readFileSync(new URL('./fixtures/vibecoding-c0a64cb5.ts', import.meta.url));
    expect(createHash('sha256').update(raw).digest('hex'))
      .toBe('26f10bd270986b4ac1bcd3c77da3c45254aa57e9bc3c23a23a2aaab719148e6a');
  });

  it('registers an explicit 301 redirect in next.config', async () => {
    expect(await config.redirects!()).toContainEqual({ source, destination, statusCode: 301 });
  });

  it.each(['', '?utm_source=geo&from=llms'])('returns 301 and Location, query=%s', async (query) => {
    await expect301(config, query);
  });

  it('publishes the canonical URL in the llms-full response', async () => {
    expectCanonical(replayOld ? oldLlmsCourseLine() : await GET().text());
  });

  it.each([destination, `${source}-unknown`])('leaves %s to the application router', async (path) => {
    const response = await unstable_getResponseFromNextConfig({ url: site + path, nextConfig: config });
    expect(response.headers.get('location')).toBeNull();
  });

  it.fails('rejects the old redirect list with the same 301 assertion', async () => {
    await expect301(oldConfig);
  });

  it.fails('rejects the old llms line with the same canonical assertion', () => {
    expectCanonical(oldLlmsCourseLine());
  });
});
