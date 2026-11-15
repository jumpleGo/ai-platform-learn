import { describe, it, expect } from 'vitest';
import { hasCourseAccess, isLocked } from '@/lib/access';
import type { Subscription } from '@/lib/types';

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  status: 'active', plan: 'base', source: 'manual', startsAt: 0, expiresAt: null, grantedBy: null, courseIds: null, ...over,
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
  it('подписка на конкретный курс открывает урок этого курса', () => {
    expect(isLocked({ access: 'paid', courseId: 'c1' }, sub({ courseIds: ['c1'] }), 1000)).toBe(false);
  });
  it('подписка на конкретный курс не открывает урок другого курса', () => {
    expect(isLocked({ access: 'paid', courseId: 'c2' }, sub({ courseIds: ['c1'] }), 1000)).toBe(true);
  });
  it('подписка на все курсы (courseIds=null) открывает любой курс', () => {
    expect(isLocked({ access: 'paid', courseId: 'c2' }, sub({ courseIds: null }), 1000)).toBe(false);
  });
});

describe('hasCourseAccess', () => {
  it('без подписки доступа нет', () => {
    expect(hasCourseAccess('c1', null, 1000)).toBe(false);
  });
  it('полная подписка открывает любой курс', () => {
    expect(hasCourseAccess('c1', sub({ courseIds: null }), 1000)).toBe(true);
  });
  it('подписка на конкретный курс открывает только его', () => {
    expect(hasCourseAccess('c1', sub({ courseIds: ['c1'] }), 1000)).toBe(true);
    expect(hasCourseAccess('c2', sub({ courseIds: ['c1'] }), 1000)).toBe(false);
  });
  it('истёкшая подписка не открывает курс', () => {
    expect(hasCourseAccess('c1', sub({ expiresAt: 500 }), 1000)).toBe(false);
  });
});
