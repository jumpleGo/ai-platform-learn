import { describe, expect, it } from 'vitest';
import { nbsp, nbspDeep } from '../src/lib/typography';

const NBSP = ' ';

describe('неразрывные пробелы', () => {
  it('не оставляет короткие слова в конце строки', () => {
    expect(nbsp('работа с ИИ')).toBe(`работа с${NBSP}ИИ`);
    expect(nbsp('Не лекции про будущее')).toBe(`Не${NBSP}лекции про${NBSP}будущее`);
  });

  it('не даёт тире начать строку', () => {
    expect(nbsp('проект — это')).toBe(`проект${NBSP}— это`);
  });

  it('держит число вместе с единицей', () => {
    expect(nbsp('8 лет')).toBe(`8${NBSP}лет`);
    expect(nbsp('2 000 ₽')).toBe(`2${NBSP}000${NBSP}₽`);
  });

  it('не трогает ссылки и строки без пробелов', () => {
    expect(nbsp('https://t.me/gelato_ai')).toBe('https://t.me/gelato_ai');
  });

  it('обходит структуру целиком, не меняя её', () => {
    const source = { title: 'о нас', items: ['для всех'], n: 3, empty: null };
    expect(nbspDeep(source)).toEqual({
      title: `о${NBSP}нас`,
      items: [`для${NBSP}всех`],
      n: 3,
      empty: null,
    });
  });
});
