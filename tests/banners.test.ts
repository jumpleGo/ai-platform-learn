import { describe, expect, it } from 'vitest';
import { hashSeed, linkKey, pickVariant, slotVariants, variantSeed } from '../src/lib/banners';
import type { Lesson, LessonBanner } from '../src/lib/types';

function variant(id: string, weight: number, html = `<b>${id}</b>`): LessonBanner {
  return { id, name: `Вариант ${id}`, html, weight };
}

function lesson(fields: Partial<Lesson>): Lesson {
  return {
    id: 'l1', courseId: 'c1', title: 'Урок', description: '', videoEmbedUrl: '',
    durationSec: null, order: 0, access: 'free', materials: '', views: 0,
    previewImageUrl: null, hideHeader: false, hideFooter: false, hideBackLink: false,
    hideLessonsNav: false, marketingVariants: [], relatedVariants: [],
    marketingHtml: null, relatedHtml: null, ...fields,
  };
}

describe('pickVariant', () => {
  it('без вариантов ничего не показывает', () => {
    expect(pickVariant([], 'seed')).toBeNull();
  });

  it('нулевые веса выключают блок', () => {
    expect(pickVariant([variant('a', 0), variant('b', 0)], 'seed')).toBeNull();
  });

  it('пустой html не участвует', () => {
    const picked = pickVariant([variant('a', 100, '   '), variant('b', 100)], 'seed');
    expect(picked?.id).toBe('b');
  });

  it('единственный активный вариант показывается всем', () => {
    const seeds = Array.from({ length: 50 }, (_, i) => `visitor-${i}`);
    const ids = seeds.map((s) => pickVariant([variant('a', 100), variant('b', 0)], s)?.id);
    expect(new Set(ids)).toEqual(new Set(['a']));
  });

  it('выбор залипает за сидом', () => {
    const variants = [variant('a', 50), variant('b', 50)];
    const first = pickVariant(variants, 'visitor-1:lesson-1:materials');
    for (let i = 0; i < 10; i++) {
      expect(pickVariant(variants, 'visitor-1:lesson-1:materials')?.id).toBe(first?.id);
    }
  });

  it('делит трафик примерно по весам', () => {
    const variants = [variant('a', 70), variant('b', 30)];
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 4000; i++) {
      const id = pickVariant(variants, variantSeed(`visitor-${i}`, 'lesson-1', 'materials'))!.id;
      counts[id]++;
    }
    const shareA = counts.a / 4000;
    expect(shareA).toBeGreaterThan(0.65);
    expect(shareA).toBeLessThan(0.75);
  });

  it('веса не обязаны давать в сумме 100', () => {
    const variants = [variant('a', 1), variant('b', 1), variant('c', 1)];
    const ids = new Set(
      Array.from({ length: 500 }, (_, i) => pickVariant(variants, `v${i}`)!.id),
    );
    expect(ids).toEqual(new Set(['a', 'b', 'c']));
  });
});

describe('slotVariants', () => {
  it('отдаёт сохранённые варианты слота', () => {
    const l = lesson({ marketingVariants: [variant('a', 100), variant('b', 50)] });
    expect(slotVariants(l, 'materials').map((v) => v.id)).toEqual(['a', 'b']);
    expect(slotVariants(l, 'related')).toEqual([]);
  });

  it('подхватывает старое одиночное поле как вариант A', () => {
    const l = lesson({ relatedHtml: '<div>promo</div>' });
    const variants = slotVariants(l, 'related');
    expect(variants).toHaveLength(1);
    expect(variants[0]).toMatchObject({ id: 'a', html: '<div>promo</div>' });
  });

  it('сохранённые варианты важнее старого поля', () => {
    const l = lesson({ marketingVariants: [variant('b', 100)], marketingHtml: '<i>old</i>' });
    expect(slotVariants(l, 'materials').map((v) => v.id)).toEqual(['b']);
  });
});

describe('linkKey / hashSeed', () => {
  it('ключ ссылки без точек и слешей', () => {
    expect(linkKey('https://start.gelato.education/?a=1')).toMatch(/^l[a-z0-9]+$/);
  });

  it('одинаковые ссылки дают одинаковый ключ, разные — разный', () => {
    expect(linkKey('https://a.ru')).toBe(linkKey('https://a.ru'));
    expect(linkKey('https://a.ru')).not.toBe(linkKey('https://b.ru'));
  });

  it('хеш стабилен', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'));
  });
});
