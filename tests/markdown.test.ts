import { describe, it, expect } from 'vitest';
import { parseInline, parseBlocks, materialsPreview } from '@/lib/markdown';

describe('materialsPreview', () => {
  it('отдаёт только первые 1-2 непустые строки', () => {
    const md = 'Первая строка\n\nВторая строка\n\nТретья строка\nЧетвёртая';
    expect(materialsPreview(md)).toBe('Первая строка\nВторая строка');
  });
  it('пропускает пустые строки в начале', () => {
    expect(materialsPreview('\n\n# Заголовок\nтекст', 1)).toBe('# Заголовок');
  });
  it('короткий текст не падает', () => {
    expect(materialsPreview('одна строка')).toBe('одна строка');
  });
});

describe('parseInline', () => {
  it('выделяет сочетание клавиш в тексте', () => {
    expect(parseInline('Жми Cmd+Enter сейчас')).toEqual([
      { t: 'text', v: 'Жми ' },
      { t: 'kbd', keys: ['Cmd', 'Enter'] },
      { t: 'text', v: ' сейчас' },
    ]);
  });

  it('Ctrl+Shift+P — три клавиши', () => {
    expect(parseInline('Ctrl+Shift+P')).toEqual([{ t: 'kbd', keys: ['Ctrl', 'Shift', 'P'] }]);
  });

  it('1+1 не считается сочетанием (нет модификатора)', () => {
    expect(parseInline('1+1')).toEqual([{ t: 'text', v: '1+1' }]);
  });

  it('явная клавиша [[Cmd+S]]', () => {
    expect(parseInline('[[Cmd+S]]')).toEqual([{ t: 'kbd', keys: ['Cmd', 'S'] }]);
  });

  it('инлайн-код, похожий на клавиши, — это kbd', () => {
    expect(parseInline('`Ctrl+C`')).toEqual([{ t: 'kbd', keys: ['Ctrl', 'C'] }]);
  });

  it('обычный инлайн-код остаётся кодом', () => {
    expect(parseInline('`npm i`')).toEqual([{ t: 'code', v: 'npm i' }]);
  });

  it('ссылка', () => {
    expect(parseInline('см [doc](https://x.com)')).toEqual([
      { t: 'text', v: 'см ' },
      { t: 'link', label: 'doc', href: 'https://x.com' },
    ]);
  });

  it('жирный и курсив', () => {
    expect(parseInline('**жирно** и *курсив*')).toEqual([
      { t: 'bold', v: 'жирно' },
      { t: 'text', v: ' и ' },
      { t: 'italic', v: 'курсив' },
    ]);
  });
});

describe('parseBlocks', () => {
  it('заголовки уровней 2 и 3', () => {
    expect(parseBlocks('## Раздел\n### Подраздел')).toEqual([
      { t: 'heading', level: 2, text: 'Раздел' },
      { t: 'heading', level: 3, text: 'Подраздел' },
    ]);
  });

  it('одиночный # приравнивается к уровню 2', () => {
    expect(parseBlocks('# Заголовок')).toEqual([{ t: 'heading', level: 2, text: 'Заголовок' }]);
  });

  it('маркированный и нумерованный списки', () => {
    expect(parseBlocks('- один\n- два')).toEqual([{ t: 'ul', items: ['один', 'два'] }]);
    expect(parseBlocks('1. первый\n2. второй')).toEqual([{ t: 'ol', items: ['первый', 'второй'] }]);
  });

  it('выноска через >', () => {
    expect(parseBlocks('> подсказка\n> вторая строка')).toEqual([
      { t: 'callout', text: 'подсказка вторая строка' },
    ]);
  });

  it('блок кода в ```', () => {
    expect(parseBlocks('```\nnpm run dev\n```')).toEqual([{ t: 'code', text: 'npm run dev' }]);
  });

  it('абзац склеивает строки, пустая строка разделяет', () => {
    expect(parseBlocks('строка один\nстрока два\n\nновый абзац')).toEqual([
      { t: 'p', text: 'строка один строка два' },
      { t: 'p', text: 'новый абзац' },
    ]);
  });
});
