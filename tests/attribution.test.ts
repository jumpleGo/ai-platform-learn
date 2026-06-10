import { describe, it, expect } from 'vitest';
import { resolveAttribution } from '@/lib/attribution';

describe('resolveAttribution', () => {
  it('возвращает partnerId и utm из cookies', () => {
    expect(resolveAttribution({ partner: 'acme', utm: '{"utm_source":"vk"}' }))
      .toEqual({ partnerId: 'acme', utm: { utm_source: 'vk' } });
  });
  it('null при отсутствии cookies', () => {
    expect(resolveAttribution({ partner: null, utm: null }))
      .toEqual({ partnerId: null, utm: null });
  });
  it('не падает на битом JSON в utm', () => {
    expect(resolveAttribution({ partner: null, utm: '{oops' }))
      .toEqual({ partnerId: null, utm: null });
  });
});
