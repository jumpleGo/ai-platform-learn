import { describe, expect, it } from 'vitest';
import { ROLL, dropTail, measure, samplePath } from '../src/lib/scene';

// Ломаная-квадрат со стороной 10: длина пути известна наперёд
const SQUARE = [
  [0, 0],
  [10, 0],
  [10, 10],
] as const;

describe('движение лимона по ломаной', () => {
  it('складывает длины сегментов', () => {
    expect(measure(SQUARE)).toEqual([0, 10, 20]);
  });

  it('ставит лимон в начало и конец пути', () => {
    const acc = measure(SQUARE);
    expect(samplePath(SQUARE, acc, 0)).toMatchObject({ x: 0, y: 0 });
    expect(samplePath(SQUARE, acc, 1)).toMatchObject({ x: 10, y: 10 });
  });

  it('идёт по долям пути, а не по номерам точек', () => {
    const acc = measure(SQUARE);
    // половина пути — ровно конец первого сегмента
    expect(samplePath(SQUARE, acc, 0.5)).toMatchObject({ x: 10, y: 0 });
    expect(samplePath(SQUARE, acc, 0.75)).toMatchObject({ x: 10, y: 5 });
  });

  it('зажимает выход за пределы 0..1', () => {
    const acc = measure(SQUARE);
    expect(samplePath(SQUARE, acc, -3)).toMatchObject({ x: 0, y: 0 });
    expect(samplePath(SQUARE, acc, 9)).toMatchObject({ x: 10, y: 10 });
  });

  it('крутит лимон тем сильнее, чем дальше он проехал', () => {
    const acc = measure(SQUARE);
    const half = samplePath(SQUARE, acc, 0.5).rot;
    const full = samplePath(SQUARE, acc, 1).rot;
    expect(half).toBeGreaterThan(0);
    expect(full).toBeCloseTo(half * 2, 5);
  });

  it('ведёт лимон со стола вниз без разрывов', () => {
    // Первые три точки имеют один x: сначала лимон падает строго вниз,
    // и лишь затем мягко входит в нарисованную дорожку.
    expect(ROLL.slice(0, 3).map(([x]) => x)).toEqual([936, 936, 936]);
    // путь собран из трёх частей, поэтому проверяем монотонность по y
    for (let i = 1; i < ROLL.length; i++) {
      expect(ROLL[i][1]).toBeGreaterThan(ROLL[i - 1][1]);
    }
  });
});

describe('dropTail', () => {
  it('срезает последнюю строку, а не последнее слово', () => {
    expect(dropTail('Первая строка\nВторая строка')).toBe('Первая строка');
  });

  it('срезает последнее предложение по знаку конца фразы', () => {
    expect(dropTail('Одно. Два! Три?')).toBe('Одно. Два!');
  });

  it('не рвёт единственное предложение — возвращает null', () => {
    expect(dropTail('Одно предложение без конца')).toBe(null);
    expect(dropTail('Одно предложение с точкой.')).toBe(null);
  });

  it('не оставляет висящих пробелов и пустых строк', () => {
    expect(dropTail('Текст\n\nХвост')).toBe('Текст');
  });
});
