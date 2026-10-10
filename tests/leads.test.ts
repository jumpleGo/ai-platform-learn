import { describe, it, expect } from 'vitest';
import { parseLeadContact } from '@/lib/leads';

describe('parseLeadContact', () => {
  it('нормализует ник Telegram в @username', () => {
    expect(parseLeadContact('  @Ivan_Petrov ')).toEqual({ contact: '@Ivan_Petrov', type: 'telegram' });
    expect(parseLeadContact('ivan_petrov')).toEqual({ contact: '@ivan_petrov', type: 'telegram' });
    expect(parseLeadContact('https://t.me/ivan_petrov/')).toEqual({ contact: '@ivan_petrov', type: 'telegram' });
    expect(parseLeadContact('telegram.me/ivan_petrov')).toEqual({ contact: '@ivan_petrov', type: 'telegram' });
  });
  it('распознаёт почту и приводит к нижнему регистру', () => {
    expect(parseLeadContact('Ivan@Example.com')).toEqual({ contact: 'ivan@example.com', type: 'email' });
  });
  it('отбрасывает мусор', () => {
    expect(parseLeadContact('')).toBeNull();
    expect(parseLeadContact('abc')).toBeNull(); // короче 5
    expect(parseLeadContact('1ivan')).toBeNull(); // ник с цифры
    expect(parseLeadContact('иван')).toBeNull();
    expect(parseLeadContact('ivan@')).toBeNull();
    expect(parseLeadContact('a'.repeat(200))).toBeNull();
  });
});
