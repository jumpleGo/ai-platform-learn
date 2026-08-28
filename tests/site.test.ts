import { describe, it, expect } from 'vitest';
import { isNavActive, navItems } from '@/lib/site';

describe('navItems', () => {
  it('гостю пункт «Моё обучение» не показывается', () => {
    expect(navItems(false).some((i) => i.label === 'Моё обучение')).toBe(false);
  });
  it('вошедшему пункт идёт первым', () => {
    expect(navItems(true)[0]).toEqual({ href: '/#learning', label: 'Моё обучение' });
  });
});

describe('isNavActive', () => {
  it('якоря главной не подсвечиваются — иначе на / горят все сразу', () => {
    expect(isNavActive('/#about', '/')).toBe(false);
    expect(isNavActive('/#learning', '/')).toBe(false);
  });
  it('раздел активен на своей странице и вложенных', () => {
    expect(isNavActive('/courses', '/courses')).toBe(true);
    expect(isNavActive('/courses', '/courses/vibecoding')).toBe(true);
    expect(isNavActive('/courses', '/free')).toBe(false);
  });
});
