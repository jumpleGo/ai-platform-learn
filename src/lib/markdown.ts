// Лёгкий markdown без зависимостей — ровно под материалы урока.
// Чистые функции (без server-only) — рендерит компонент Markdown, тестируются отдельно.
import { plural } from '@/lib/utils';

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'italic'; v: string }
  | { t: 'code'; v: string }
  | { t: 'kbd'; keys: string[] }
  | { t: 'link'; href: string; label: string };

export type Block =
  | { t: 'heading'; level: 2 | 3; text: string }
  | { t: 'p'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'callout'; text: string }
  | { t: 'code'; text: string }
  | { t: 'table'; headers: string[]; rows: string[][] };

// --- горячие клавиши ---------------------------------------------------------

const MODIFIERS = /^(cmd|command|ctrl|control|shift|alt|option|win|super|meta|fn|⌘|⌥|⇧|⌃)$/i;
const KEY =
  '(?:Cmd|Command|Ctrl|Control|Shift|Alt|Option|Win|Super|Meta|Fn|Enter|Return|Escape|Esc|Tab|Space|Backspace|Delete|Del|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|PageUp|PageDown|PgUp|PgDn|Home|End|F1[0-2]|F[1-9]|⌘|⌥|⇧|⌃|↵|[A-Za-z0-9])';
// Комбинация: минимум два «ключа» через +. Модификатор обязателен — отсекает «1+1», «a+b»
const COMBO = new RegExp(`${KEY}(?:\\s*\\+\\s*${KEY})+`, 'g');

export function isShortcut(text: string): boolean {
  const keys = text.split('+').map((k) => k.trim());
  return keys.length >= 2 && keys.some((k) => MODIFIERS.test(k));
}

function splitKbd(keys: string): string[] {
  return keys.split('+').map((k) => k.trim()).filter(Boolean);
}

// Разбивает обычный текст, выделяя комбинации клавиш в kbd-токены
function autoKbd(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(COMBO)) {
    if (!isShortcut(m[0])) continue;
    if (m.index! > last) out.push({ t: 'text', v: text.slice(last, m.index) });
    out.push({ t: 'kbd', keys: splitKbd(m[0]) });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}

// Один проход: явные токены (ссылка/код/жирный/курсив/kbd), остальное — на автоопределение клавиш
const TOKEN = new RegExp(
  [
    '\\[\\[(.+?)\\]\\]', // 1: [[Cmd+Enter]] — явная клавиша
    '\\[(.+?)\\]\\((.+?)\\)', // 2 label, 3 href
    '`([^`]+)`', // 4: code
    '\\*\\*(.+?)\\*\\*', // 5: bold
    '\\*(.+?)\\*', // 6: italic *
    '_(.+?)_', // 7: italic _
  ].join('|'),
  'g',
);

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) out.push(...autoKbd(text.slice(last, m.index)));
    if (m[1] != null) out.push({ t: 'kbd', keys: splitKbd(m[1]) });
    else if (m[2] != null) out.push({ t: 'link', label: m[2], href: m[3] });
    else if (m[4] != null) {
      // инлайн-код, похожий на сочетание клавиш, показываем как kbd
      out.push(isShortcut(m[4]) ? { t: 'kbd', keys: splitKbd(m[4]) } : { t: 'code', v: m[4] });
    } else if (m[5] != null) out.push({ t: 'bold', v: m[5] });
    else if (m[6] != null) out.push({ t: 'italic', v: m[6] });
    else if (m[7] != null) out.push({ t: 'italic', v: m[7] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(...autoKbd(text.slice(last)));
  return out;
}

// Оглавление материалов для закрытого урока: о чём пойдёт речь — заголовки разделов
// и состав материалов. Сам текст разделов клиенту не уходит.
export type MaterialsTeaser = {
  topics: string[];
  // Сколько разделов не поместилось в список
  more: number;
  // Что внутри: примеры кода, таблицы, шаги, ссылки
  facts: string[];
  // Запасной тизер, когда заголовков в материалах нет — начало первого абзаца
  intro: string | null;
};

// Разметка внутри строки нужна не везде: в карточках и тизерах текст короткий и
// показывается как есть, поэтому маркеры **жирного** и прочее просто снимаем.
export function plainText(text: string): string {
  return parseInline(text)
    .map((tok) => (tok.t === 'kbd' ? tok.keys.join('+') : tok.t === 'link' ? tok.label : tok.v))
    .join('')
    .trim();
}

export function materialsTeaser(md: string, maxTopics = 6): MaterialsTeaser {
  const blocks = parseBlocks(md);
  const headings = blocks.filter((b) => b.t === 'heading');
  // Крупных разделов достаточно — показываем только их, иначе спускаемся к подзаголовкам
  const sections = headings.filter((h) => h.level === 2);
  const all = (sections.length >= 3 ? sections : headings).map((h) => plainText(h.text)).filter(Boolean);

  const codeCount = blocks.filter((b) => b.t === 'code').length;
  const tableCount = blocks.filter((b) => b.t === 'table').length;
  const stepCount = blocks.reduce((n, b) => (b.t === 'ol' ? n + b.items.length : n), 0);
  const linkCount = [...md.matchAll(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g)].length;

  const facts: string[] = [];
  if (codeCount) facts.push(`${codeCount} ${plural(codeCount, ['пример кода', 'примера кода', 'примеров кода'])}`);
  if (stepCount) facts.push(`${stepCount} ${plural(stepCount, ['шаг', 'шага', 'шагов'])} по порядку`);
  if (tableCount) facts.push(plural(tableCount, ['таблица', 'таблицы', 'таблиц']));
  if (linkCount) facts.push(`${linkCount} ${plural(linkCount, ['ссылка', 'ссылки', 'ссылок'])}`);

  const firstPara = blocks.find((b) => b.t === 'p');
  const intro = all.length === 0 && firstPara ? truncate(plainText(firstPara.text), 180) : null;

  return { topics: all.slice(0, maxTopics), more: Math.max(0, all.length - maxTopics), facts, intro };
}

// Обрезка по границе слова с многоточием
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[.,;:—-]+$/, '')}…`;
}

// --- блоки -------------------------------------------------------------------

export function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const flushPara = (buf: string[]) => {
    if (buf.length) blocks.push({ t: 'p', text: buf.join(' ').trim() });
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { i++; continue; }

    // ```code fence```
    if (line.trim().startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { body.push(lines[i]); i++; }
      i++; // закрывающий ```
      blocks.push({ t: 'code', text: body.join('\n') });
      continue;
    }

    // # / ## / ### заголовок (одиночный # приравниваем к ##)
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) { blocks.push({ t: 'heading', level: h[1].length >= 3 ? 3 : 2, text: h[2].trim() }); i++; continue; }

    // > выноска (склеиваем подряд идущие)
    if (/^>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { body.push(lines[i].replace(/^>\s?/, '')); i++; }
      blocks.push({ t: 'callout', text: body.join(' ').trim() });
      continue;
    }

    // - / * маркированный список
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++; }
      blocks.push({ t: 'ul', items });
      continue;
    }

    // 1. нумерованный список
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
      blocks.push({ t: 'ol', items });
      continue;
    }

    // таблица GFM: строки с |
    if (/^\s*\|/.test(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { tableLines.push(lines[i]); i++; }
      const parseRow = (r: string) =>
        r.split('|').slice(1, -1).map((c) => c.trim());
      const isSep = (r: string) => /^\s*\|[\s|:-]+\|\s*$/.test(r);
      if (tableLines.length >= 2 && isSep(tableLines[1])) {
        const headers = parseRow(tableLines[0]);
        const rows = tableLines.slice(2).map(parseRow);
        blocks.push({ t: 'table', headers, rows });
      } else {
        // не таблица — сваливаем в параграф
        blocks.push({ t: 'p', text: tableLines.join(' ').trim() });
      }
      continue;
    }

    // абзац — до пустой строки или начала другого блока
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*\|/.test(lines[i])
    ) { buf.push(lines[i]); i++; }
    flushPara(buf);
  }

  return blocks;
}
