import { describe, it, expect } from 'vitest';
import { isLocked } from '@/lib/access';
import type { Subscription } from '@/lib/types';

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  status: 'active', plan: 'base', source: 'manual', startsAt: 0, expiresAt: null, grantedBy: null, ...over,
});

describe('isLocked', () => {
  it('free-урок открыт независимо от подписки', () => {
    expect(isLocked({ access: 'free' }, null, 1000)).toBe(false);
  });
  it('paid-урок закрыт без подписки', () => {
    expect(isLocked({ access: 'paid' }, null, 1000)).toBe(true);
  });
  it('активная подписка открывает paid-урок', () => {
    expect(isLocked({ access: 'paid' }, sub(), 1000)).toBe(false);
  });
  it('истёкшая подписка не открывает', () => {
    expect(isLocked({ access: 'paid' }, sub({ expiresAt: 500 }), 1000)).toBe(true);
  });
  it('подписка со статусом expired не открывает', () => {
    expect(isLocked({ access: 'paid' }, sub({ status: 'expired' }), 1000)).toBe(true);
  });
  it('подписка из будущего не открывает', () => {
    expect(isLocked({ access: 'paid' }, sub({ startsAt: 2000 }), 1000)).toBe(true);
  });
});
