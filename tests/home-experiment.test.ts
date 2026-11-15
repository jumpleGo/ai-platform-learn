import { describe, expect, it } from 'vitest';
import { isHomeVariant, pickHomeVariant } from '../src/lib/home-experiment';

// Похожи на реальные id из cookie vid — их выдаёт crypto.randomUUID()
const ids = Array.from({ length: 4000 }, (_, i) => {
  const hex = i.toString(16).padStart(12, '0');
  return `f47ac10b-58cc-4372-a567-${hex}`;
});

describe('A/B главной', () => {
  it('держит вариант за посетителем', () => {
    const first = pickHomeVariant('c0ffee-1234');
    expect(pickHomeVariant('c0ffee-1234')).toBe(first);
  });

  it('отдаёт сцену всем посетителям при SCENE_SHARE = 1.0', () => {
    const scene = ids.filter((id) => pickHomeVariant(id) === 'scene').length;
    expect(scene).toBe(ids.length);
  });

  it('признаёт только известные варианты', () => {
    expect(isHomeVariant('scene')).toBe(true);
    expect(isHomeVariant('classic')).toBe(true);
    expect(isHomeVariant('gelateria')).toBe(false);
    expect(isHomeVariant(undefined)).toBe(false);
  });
});
