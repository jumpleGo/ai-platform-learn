import { describe, expect, it } from 'vitest';
import {
  formatStreamDate,
  getNextStreamDate,
  getStreamStartDate,
  VIBECODING_BASE_STREAM_DATE,
} from '../src/lib/payments/stream-schedule';

describe('Stream schedule rollover mechanism', () => {
  it('возвращает базовую дату 21 сентября, если до неё больше 1 дня', () => {
    // 15 сентября 2026 (за 6 дней до старта)
    const date15 = new Date('2026-09-15T12:00:00+03:00');
    expect(getStreamStartDate(date15)).toBe('21 сентября');

    // 19 сентября 2026 23:59:59 (за 2 дня до старта, суббота)
    const date19 = new Date('2026-09-19T23:59:59+03:00');
    expect(getStreamStartDate(date19)).toBe('21 сентября');
  });

  it('переключает дату на 7 дней вперед при приближении за 1 день (воскресенье 20 сентября)', () => {
    // Воскресенье, 20 сентября 2026, 00:01:00 — ровно 1 день до 21 сентября
    const date20Morning = new Date('2026-09-20T00:01:00+03:00');
    expect(getStreamStartDate(date20Morning)).toBe('28 сентября');

    // Воскресенье, 20 сентября 2026, 23:59:00
    const date20Evening = new Date('2026-09-20T23:59:00+03:00');
    expect(getStreamStartDate(date20Evening)).toBe('28 сентября');
  });

  it('в день старта (понедельник 21 сентября) держит следующий поток (28 сентября)', () => {
    const date21 = new Date('2026-09-21T12:00:00+03:00');
    expect(getStreamStartDate(date21)).toBe('28 сентября');
  });

  it('в течение недели показывает актуальный поток, а за день до него снова переносит на 7 дней', () => {
    // Суббота 26 сентября — за 2 дня до 28 сентября
    const date26 = new Date('2026-09-26T18:00:00+03:00');
    expect(getStreamStartDate(date26)).toBe('28 сентября');

    // Воскресенье 27 сентября — за 1 день до 28 сентября -> переносит на 5 октября
    const date27 = new Date('2026-09-27T10:00:00+03:00');
    expect(getStreamStartDate(date27)).toBe('5 октября');

    // Понедельник 28 сентября -> 5 октября
    const date28 = new Date('2026-09-28T10:00:00+03:00');
    expect(getStreamStartDate(date28)).toBe('5 октября');

    // Воскресенье 4 октября -> переносит на 12 октября
    const dateOct4 = new Date('2026-10-04T12:00:00+03:00');
    expect(getStreamStartDate(dateOct4)).toBe('12 октября');
  });

  it('корректно работает далеко в будущем без зацикливания', () => {
    // Дата через полгода (март 2027)
    const futureDate = new Date('2027-03-10T12:00:00+03:00');
    const nextStream = getNextStreamDate(futureDate);

    expect(nextStream.getTime()).toBeGreaterThan(futureDate.getTime());
    // Разница между датой потока и текущей датой должна быть строго больше 1 дня
    const diffDays = (nextStream.getTime() - futureDate.getTime()) / (24 * 3600 * 1000);
    expect(diffDays).toBeGreaterThan(1);
    expect(diffDays).toBeLessThanOrEqual(8);
  });
});
