import { describe, it, expect } from 'vitest';
import { parseInline, parseBlocks, materialsTeaser } from '@/lib/markdown';

describe('materialsTeaser', () => {
  const md = [
    '## Установка Claude Code',
    '',
    '### Шаг 1: Открыть терминал',
    'Запустите терминал.',
    '',
    '### Шаг 2: Выполнить команду',
    '```',
    'curl -fsSL https://claude.ai/install.sh | bash',
    '```',
    '',
    '## Модели Claude Code',
    '',
    '| Модель | Характеристика |',
    '|---|---|',
    '| Opus | Умная |',
    '',
    '## Домашнее задание',
    '1. Установить',
    '2. Запустить',
  ].join('\n');

  it('берёт крупные разделы, когда их достаточно', () => {
    expect(materialsTeaser(md).topics).toEqual([
      'Установка Claude Code',
      'Модели Claude Code',
      'Домашнее задание',
    ]);
  });
  it('описывает состав материалов', () => {
    expect(materialsTeaser(md).facts).toEqual(['1 пример кода', '2 шага по порядку', 'таблица']);
  });
  it('спускается к подзаголовкам, когда крупных разделов мало', () => {
    const short = '## Один раздел\n\n### Первый шаг\n\n### Второй шаг';
    expect(materialsTeaser(short).topics).toEqual(['Один раздел', 'Первый шаг', 'Второй шаг']);
  });
  it('снимает разметку с заголовков', () => {
    expect(materialsTeaser('## **Жирный** и `код`').topics).toEqual(['Жирный и код']);
  });
  it('считает лишние разделы', () => {
    const many = ['## A', '## B', '## C', '## D'].join('\n\n');
    const teaser = materialsTeaser(many, 2);
    expect(teaser.topics).toEqual(['A', 'B']);
    expect(teaser.more).toBe(2);
  });
  it('без заголовков отдаёт начало первого абзаца', () => {
    const teaser = materialsTeaser('Короткий текст без заголовков.');
    expect(teaser.topics).toEqual([]);
    expect(teaser.intro).toBe('Короткий текст без заголовков.');
  });
  it('обрезает длинный абзац по границе слова', () => {
    const long = 'слово '.repeat(60).trim();
    const intro = materialsTeaser(long).intro!;
    expect(intro.endsWith('…')).toBe(true);
    expect(intro.length).toBeLessThanOrEqual(181);
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
    expect(parseBlocks('1. первый\n2. второй')).toEqual([{ t: 'ol', items: ['первый', 'второй'], start: 1 }]);
    expect(parseBlocks('1. первый\n\n2. второй\n\n3. третий')).toEqual([{ t: 'ol', items: ['первый', 'второй', 'третий'], start: 1 }]);
    expect(parseBlocks('6. шестой\n7. седьмой')).toEqual([{ t: 'ol', items: ['шестой', 'седьмой'], start: 6 }]);
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
