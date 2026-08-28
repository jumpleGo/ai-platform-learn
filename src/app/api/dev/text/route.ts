import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { nbsp } from '@/lib/typography';

// Правка текста прямо со страницы: браузер присылает старый и новый текст,
// роут находит строку в исходниках и переписывает файл. Только в dev.
// Переносы строк приходят как \n и записываются по месту: <br /> в JSX,
// escape-последовательность в строковом литерале, обычный перевод строки в md.

const ROOT = process.cwd();
const SEARCH_DIRS = ['src'];
const EXTS = new Set(['.ts', '.tsx', '.md', '.mdx']);
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dev']);

type Candidate = { file: string; line: number; preview: string };
type Flavor = 'jsx' | 'literal' | 'markdown';

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectFiles(path.join(dir, entry.name), out);
    } else if (EXTS.has(path.extname(entry.name))) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

// В исходниках текст лежит с обычными пробелами, может быть разбит переносами
// строк с отступами, а неразрывный пробел встречается и символом U+00A0, и как
// HTML-сущность. В DOM же всё это приходит одним пробельным символом, поэтому
// ищем по регэкспу, где любой разделитель совпадает с любым из вариантов.
const SPACE = '[\\s\\u00a0]';
// Разделитель слов: в исходнике на этом месте может стоять пробел, перенос строки
// с отступом, HTML-сущность, escape-последовательность \n или <br /> — на странице
// всё это выглядит одинаково (пробелом или переносом).
const SEPARATOR = `(?:${SPACE}|&nbsp;|&#160;|&#xa0;|\\\\n|<br\\s*/?>)+`;

// Явный перенос строки: <br /> в JSX или escape-последовательность в литерале.
// В md переносом служит обычный перевод строки, поэтому там альтернатива шире.
function breakPattern(raw: boolean): string {
  const tokens = ['<br\\s*/?>', '\\\\n', ...(raw ? ['\\n'] : [])];
  return `(?:${SPACE}*(?:${tokens.join('|')})${SPACE}*)+`;
}

// Один и тот же символ в исходнике может быть записан по-разному: сущностью в
// JSX или с обратным слешем внутри строкового литерала. В DOM он всегда один.
const CHAR_ALTERNATIVES: Record<string, string> = {
  '<': '(?:<|&lt;)',
  '>': '(?:>|&gt;)',
  '{': '(?:\\{|&#123;)',
  '}': '(?:\\}|&#125;)',
  '&': '(?:&|&amp;)',
  "'": "(?:\\\\?'|&#39;|&apos;)",
  '"': '(?:\\\\?"|&quot;)',
};

function escapeChar(char: string): string {
  return CHAR_ALTERNATIVES[char] ?? char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Маркеры **жирный** и *курсив* в исходнике выглядят как <strong>/<em> (или как
// сами маркеры, если текст ещё не сохранялся) — поэтому даём альтернативу.
function words(value: string): string {
  return value
    .trim()
    .split(/[\s\u00a0]+/)
    .filter(Boolean)
    .map((word) => [...word].map(escapeChar).join(''))
    .join(SEPARATOR);
}

function linePattern(value: string): string {
  const parts: string[] = [];
  let last = 0;
  for (const match of value.matchAll(/\*\*(.+?)\*\*|\*(.+?)\*/g)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(words(value.slice(last, at)));
    const bold = match[1] !== undefined;
    const inner = words(match[1] ?? match[2] ?? '');
    const tags = bold ? '(?:strong|b)' : '(?:em|i)';
    const marker = bold ? '\\*\\*' : '\\*';
    parts.push(
      `(?:<${tags}>${SPACE}*${inner}${SPACE}*</${tags}>|${marker}${inner}${marker})`,
    );
    last = at + match[0].length;
  }
  if (last < value.length) parts.push(words(value.slice(last)));
  // между сегментами пробел не обязателен: «текст<strong>» тоже валиден
  return parts.filter(Boolean).join(`(?:${SEPARATOR})?`);
}

function buildNeedle(text: string, raw: boolean): RegExp {
  const source = text.split('\n').map(linePattern).join(breakPattern(raw));
  return new RegExp(source, 'g');
}

// Совпадение «точное», если текст занимает строковый литерал или JSX-узел целиком.
// Иначе это подстрока внутри более длинной надписи — такие кандидаты показываем
// только когда точных нет.
function isExact(source: string, match: RegExpMatchArray): boolean {
  const start = match.index ?? 0;
  const before = source.slice(0, start).replace(/[\s ]+$/, '').slice(-1);
  const after = source.slice(start + match[0].length).replace(/^[\s ]+/, '').slice(0, 1);
  return /['"`>{]/.test(before) && /['"`<}]/.test(after);
}

// Текст мог не найтись по двум разным причинам: он собран из переменных
// (`... ${TELEGRAM_DM}`) или пришёл из базы. Различаем это поиском по краям:
// первые и последние слова совпадают, а середина — что угодно в пределах строки.
function looseNeedles(text: string): RegExp[] {
  const all = text.replace(/[\s\u00a0]+/g, ' ').trim().split(' ');
  if (all.length < 6) return [];
  const head = words(all.slice(0, 3).join(' '));
  const tail = words(all.slice(-3).join(' '));
  // подстановка может быть в середине, в конце или в начале — пробуем все якоря
  return [
    new RegExp(`${head}[^\n]{0,600}?${tail}`),
    new RegExp(words(all.slice(0, 5).join(' '))),
    new RegExp(words(all.slice(-5).join(' '))),
  ];
}

async function findLoose(files: string[], text: string): Promise<string | null> {
  const needles = looseNeedles(text);
  if (needles.length === 0) return null;
  for (const needle of needles) {
    for (const absolute of files) {
      const source = await readFile(absolute, 'utf8');
      const match = needle.exec(source);
      if (match) return `${path.relative(ROOT, absolute)}:${lineOf(source, match.index ?? 0)}`;
    }
  }
  return null;
}

// ── Отбраковка мест, которых на странице быть не может ───────────────────────

// Диапазоны комментариев в файле: текст оттуда на страницу не попадает
function commentRanges(source: string): [number, number][] {
  const ranges: [number, number][] = [];
  let i = 0;
  let quote = '';
  while (i < source.length) {
    const char = source[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = '';
    } else if (char === "'" || char === '"' || char === '`') {
      quote = char;
    } else if (char === '/' && source[i + 1] === '/') {
      const end = source.indexOf('\n', i);
      ranges.push([i, end === -1 ? source.length : end]);
      i = end === -1 ? source.length : end;
      continue;
    } else if (char === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      ranges.push([i, end === -1 ? source.length : end + 2]);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    i++;
  }
  return ranges;
}

// Атрибуты, которые никогда не видны как текст на странице. У компонентов
// (тег с большой буквы) те же имена могут быть обычными пропсами с текстом.
const HIDDEN_ATTRS = /^(aria-|data-)|^(alt|placeholder|href|src|srcset|sizes|loading|class|classname|id|key|type|name|role|rel|target|style|content|property|lang|value)$/i;
const HTML_ONLY_ATTRS = /^(title|label)$/i;

function attributeAt(source: string, start: number): { attr: string; tag: string } | null {
  const lineStart = source.lastIndexOf('\n', start - 1) + 1;
  const head = source.slice(lineStart, start);
  const attr = head.match(/([A-Za-z_$][\w$-]*)\s*=\s*["'`][^"'`]*$/);
  if (!attr) return null;
  const open = source.lastIndexOf('<', start);
  const tag = source.slice(open + 1).match(/^[A-Za-z][\w.-]*/)?.[0] ?? '';
  return { attr: attr[1], tag };
}

// export const metadata — это title/description для браузера, не текст страницы
function inMetadata(source: string, start: number): boolean {
  const at = source.lastIndexOf('export const metadata', start);
  if (at === -1) return false;
  const end = source.indexOf('\n};', at);
  return end === -1 || start < end;
}

// seoTitle, seoDescription, ogDescription… — тексты для поисковиков, не для страницы
const SEO_KEYS = /^(seo|meta|og|twitter)[A-Z]|^(seoTitle|seoDescription|canonical)$/;

function isRenderable(source: string, start: number, comments: [number, number][]): boolean {
  if (comments.some(([from, to]) => start >= from && start < to)) return false;
  if (inMetadata(source, start)) return false;
  const key = [...source.slice(0, start).matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].pop();
  if (key && SEO_KEYS.test(key[1])) return false;
  const attribute = attributeAt(source, start);
  if (attribute) {
    if (HIDDEN_ATTRS.test(attribute.attr)) return false;
    // у html-тегов title/label — атрибуты, у компонентов — текстовые пропсы
    if (HTML_ONLY_ATTRS.test(attribute.attr) && /^[a-z]/.test(attribute.tag)) return false;
  }
  return true;
}

// ── Выбор нужного места, когда текст встречается несколько раз ───────────────
// Спрашивать «какой из пяти файлов» плохо: страница знает достаточно, чтобы
// определить место самой — свой маршрут, компонент-владелец и соседний текст.

type Candidate2 = { file: string; source: string; match: RegExpMatchArray };

// Маршрут, на котором может отрисоваться файл из src/app. Файлы вне src/app
// (компоненты, контент) не привязаны к маршруту.
function routeOf(file: string): { route: string; layout: boolean } | null {
  const rel = path.relative(path.join(ROOT, 'src/app'), file);
  if (rel.startsWith('..')) return null;
  const parts = rel.split(path.sep);
  const name = parts.pop() ?? '';
  if (!/^(page|layout|template)\.tsx$/.test(name)) return null;
  const route = '/' + parts.filter((part) => !part.startsWith('(')).join('/');
  return { route: route.replace(/\/$/, '') || '/', layout: name !== 'page.tsx' };
}

function routeMatches(file: string, pathname: string): boolean {
  const info = routeOf(file);
  if (!info) return true; // не привязан к маршруту — подходит всегда
  const actual = pathname.replace(/\/$/, '') || '/';
  const wanted = info.route.split('/');
  const given = actual.split('/');
  if (info.layout ? given.length < wanted.length : given.length !== wanted.length) return false;
  return wanted.every(
    (part, i) => part === given[i] || (part.startsWith('[') && Boolean(given[i])),
  );
}

// Классы элемента и его родителей: они почти дословно лежат в том же месте
// исходника, поэтому отличают и файл, и конкретное место внутри файла.
function contextScore(candidate: Candidate2, classes: string[]): number {
  const at = candidate.match.index ?? 0;
  const region = candidate.source.slice(Math.max(0, at - 3000), at + 3000);
  let score = 0;
  for (const value of classes) {
    const short = value.split(' ').slice(0, 4).join(' ');
    if (value && (region.includes(value) || (short.length > 8 && region.includes(short)))) score++;
  }
  return score;
}

// Соседний текст со страницы рядом с этим местом в файле — самый сильный признак
function nearbyScore(candidate: Candidate2, near: string[], window: number): number {
  const at = candidate.match.index ?? 0;
  const region = candidate.source.slice(Math.max(0, at - window), at + window);
  let score = 0;
  for (const text of near) {
    const needle = words(text.split(/[\s\u00a0]+/).slice(0, 6).join(' '));
    if (needle && new RegExp(needle).test(region)) score++;
  }
  return score;
}

// Файл контента может связывать slug маршрута с объектом: LANDINGS = { 'vibecoding': VIBECODING }.
// Тогда правим внутри именно этого объекта.
function slugScope(source: string, pathname: string): [number, number] | null {
  for (const segment of pathname.split('/').filter(Boolean).reverse()) {
    const link = new RegExp(`['"]?${segment}['"]?\\s*:\\s*([A-Za-z_$][\\w$]*)`).exec(source);
    if (!link) continue;
    const declaration = new RegExp(`(?:const|let|var)\\s+${link[1]}\\b`).exec(source);
    if (!declaration) continue;
    const start = declaration.index;
    const end = source.indexOf('\n};', start);
    return [start, end === -1 ? source.length : end];
  }
  return null;
}

// По классам элемента находим место в разметке и смотрим, что там подставляется:
// {fact.title} или {eyebrow}. Имя подсказывает, какое из одинаковых мест в файле
// контента правится — title или value.
async function expressionNames(files: string[], classes: string[]): Promise<Set<string>> {
  const sites = await classSites(files);
  let best: { site: (typeof sites)[number]; score: number } | null = null;
  for (const site of sites) {
    if (site.classes.length === 0) continue;
    const score = site.classes.filter((name) => classes.some((value) => value.split(' ').includes(name))).length;
    if (score > 0 && score === site.classes.length && (!best || score > best.score)) best = { site, score };
  }
  const names = new Set<string>();
  if (!best) return names;
  const region = best.site.source.slice(best.site.index, best.site.index + 400);
  for (const match of region.matchAll(/\{\s*(?:[A-Za-z_$][\w$]*\.)*([A-Za-z_$][\w$]*)\s*\}/g)) {
    names.add(match[1]);
  }
  return names;
}

function leafKey(source: string, index: number): string {
  return [...source.slice(0, index).matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].pop()?.[1] ?? '';
}

async function narrow(
  candidates: Candidate2[],
  files: string[],
  context: {
    path?: string;
    owner?: string;
    near?: string[];
    breaks?: number;
    classes?: string[];
  },
): Promise<Candidate2[]> {
  let rest = candidates;
  const keep = (next: Candidate2[]) => {
    if (next.length > 0 && next.length < rest.length) rest = next;
  };

  // столько же переносов, сколько на странице: поиск терпим к ним, выбор — нет
  if (context.breaks !== undefined) {
    keep(
      rest.filter(
        (item) => (item.match[0].match(/<br\s*\/?>|\\n/g) ?? []).length === context.breaks,
      ),
    );
  }
  if (context.path) keep(rest.filter((item) => routeMatches(item.file, context.path!)));
  if (rest.length > 1 && context.owner) {
    const declares = new RegExp(`(function|const|class)\\s+${context.owner}\\b`);
    keep(rest.filter((item) => declares.test(item.source)));
  }
  if (rest.length > 1 && context.classes?.length) {
    const scored = rest.map((item) => ({ item, score: contextScore(item, context.classes!) }));
    const best = Math.max(...scored.map((entry) => entry.score));
    if (best > 0) keep(scored.filter((entry) => entry.score === best).map((entry) => entry.item));
  }
  // Слug текущего маршрута часто прямо связан с объектом в файле контента
  if (rest.length > 1 && context.path) {
    const scoped = rest.filter((item) => {
      const range = slugScope(item.source, context.path!);
      const at = item.match.index ?? 0;
      return range ? at >= range[0] && at < range[1] : false;
    });
    keep(scoped);
  }
  if (rest.length > 1 && context.near?.length) {
    // от узкого окна к широкому: соседние места в файле так тоже различаются
    for (const window of [250, 800, 2000]) {
      const scored = rest.map((item) => ({ item, score: nearbyScore(item, context.near!, window) }));
      const best = Math.max(...scored.map((entry) => entry.score));
      if (best === 0) continue;
      const winners = scored.filter((entry) => entry.score === best).map((entry) => entry.item);
      keep(winners);
      if (rest.length === 1) break;
    }
  }
  // последний признак: имя подставляемого свойства из разметки
  if (rest.length > 1 && context.classes?.length) {
    const names = await expressionNames(files, context.classes);
    if (names.size > 0) {
      keep(
        rest.filter((item) => {
          const attribute = attributeAt(item.source, item.match.index ?? 0);
          return (
            names.has(leafKey(item.source, item.match.index ?? 0)) ||
            (attribute ? names.has(attribute.attr) : false)
          );
        }),
      );
    }
  }
  return rest;
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

// Чем окружён текст в исходнике: от этого зависит и запись переноса, и экранирование.
// Смотреть на один символ перед совпадением нельзя — правка середины строки давала
// «jsx» и записывала <br /> прямо в текст. Поэтому разбираем строку файла с начала
// и смотрим, открыта ли на месте совпадения кавычка.
function flavorAt(file: string, source: string, start: number): { flavor: Flavor; quote: string } {
  if (/\.mdx?$/.test(file)) return { flavor: 'markdown', quote: '' };
  const lineStart = source.lastIndexOf('\n', start - 1) + 1;
  let quote = '';
  for (let i = lineStart; i < start; i++) {
    const char = source[i];
    if (char === '\\\\') {
      i++;
    } else if (quote) {
      if (char === quote) quote = '';
    } else if (char === "'" || char === '"' || char === '`') {
      quote = char;
    }
  }
  return quote ? { flavor: 'literal', quote } : { flavor: 'jsx', quote: '' };
}

function escapeLine(line: string, flavor: Flavor, quote: string): string {
  if (flavor === 'markdown') return line;
  if (flavor === 'jsx') {
    // В JSX-тексте нельзя оставлять угловые и фигурные скобки как есть
    return line
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/[{}]/g, (char) => (char === '{' ? '&#123;' : '&#125;'));
  }
  const escaped = line.replace(/\\/g, '\\\\').split(quote).join(`\\${quote}`);
  return quote === '`' ? escaped.replace(/\$\{/g, '\\${') : escaped;
}

// Перенос внутри строкового литерала — это \n в тексте: чтобы он отрисовался,
// элементу нужен whitespace-pre-line. Ищем этот элемент в исходниках по тегу и
// классам. Сравниваем наборами, а не строкой: cn()/twMerge переставляют классы
// и добавляют свои, поэтому литерал в JSX — подмножество того, что в DOM.
type ClassSite = {
  file: string;
  source: string;
  index: number;
  insertAt: number;
  classes: string[];
  tag: string;
};

// Классы из шаблонной строки: ${...} вырезаем, обрубки на границах интерполяции
// отбрасываем — «w-» из `w-${size}` классом не является.
function staticClasses(raw: string): string[] {
  const out: string[] = [];
  const parts = raw.split(/\$\{[^}]*\}/g);
  parts.forEach((part, partIndex) => {
    const tokens = part.split(/\s+/);
    const cutStart = partIndex > 0 && !/^\s/.test(part);
    const cutEnd = partIndex < parts.length - 1 && !/\s$/.test(part);
    tokens.forEach((token, tokenIndex) => {
      if (!token) return;
      if (cutStart && tokenIndex === 0) return;
      if (cutEnd && tokenIndex === tokens.length - 1) return;
      out.push(token);
    });
  });
  return out;
}

// Конец шаблонной строки с учётом ${...} внутри
function templateEnd(source: string, from: number): number {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    const char = source[i];
    if (char === '\\') i++;
    else if (char === '$' && source[i + 1] === '{') depth++;
    else if (char === '}' && depth > 0) depth--;
    else if (char === '`' && depth === 0) return i;
  }
  return -1;
}

// Конец вызова с учётом вложенных скобок
function callEnd(source: string, from: number): number {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
}

async function classSites(files: string[]): Promise<ClassSite[]> {
  const sites: ClassSite[] = [];
  for (const absolute of files) {
    if (!absolute.endsWith('.tsx')) continue;
    const source = await readFile(absolute, 'utf8');
    for (const match of source.matchAll(/className=(["{])/g)) {
      const index = match.index ?? 0;
      const valueAt = index + 'className='.length;
      let classes: string[];
      let insertAt: number;

      if (match[1] === '"') {
        const close = source.indexOf('"', valueAt + 1);
        if (close === -1) continue;
        classes = source.slice(valueAt + 1, close).split(/\s+/).filter(Boolean);
        insertAt = close;
      } else if (source[valueAt + 1] === '`') {
        const close = templateEnd(source, valueAt + 2);
        if (close === -1) continue;
        classes = staticClasses(source.slice(valueAt + 2, close));
        insertAt = close;
      } else if (source.startsWith('cn(', valueAt + 1)) {
        // className={cn('base ...', ...)} — классы берём из строковых литералов
        // внутри вызова, дописываем в первый из них
        const call = callEnd(source, valueAt + 1 + 'cn('.length);
        if (call === -1) continue;
        const inner = source.slice(valueAt + 1 + 'cn('.length, call);
        const literals = [...inner.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)];
        if (literals.length === 0) continue;
        classes = literals.flatMap((literal) => staticClasses(literal[2]));
        insertAt = valueAt + 1 + 'cn('.length + (literals[0].index ?? 0) + literals[0][0].length - 1;
      } else {
        // className={переменная} — привязать к исходнику нельзя
        continue;
      }

      const open = source.lastIndexOf('<', index);
      const tag = source.slice(open + 1).match(/^[A-Za-z][\w.-]*/)?.[0] ?? '';
      sites.push({ file: absolute, source, index, insertAt, classes, tag });
    }
  }
  return sites;
}

// Путь до строки в контенте: note внутри hero → «hero.note». По нему отличаем
// нужный <p> от соседних с тем же className: в JSX стоит {COPY.hero.note}.
function contentPath(source: string, index: number): string {
  const head = source.slice(0, index);
  const leaf = [...head.matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].pop();
  if (!leaf) return '';
  const outer = [...head.slice(0, leaf.index).matchAll(/([A-Za-z_$][\w$]*)\s*:\s*\{/g)].pop();
  return outer ? `${outer[1]}.${leaf[1]}` : leaf[1];
}

// Лучшее место в разметке для этого элемента: по тегу, классам, пути до
// контента и компоненту-владельцу. Используется и для класса, и для обёртки.
async function bestSite(
  files: string[],
  element: { tag?: string; className?: string; owner?: string },
  hint: string,
): Promise<ClassSite | null> {
  const { tag, className, owner } = element;
  if (!tag || !className) return null;
  const inDom = new Set(className.split(/\s+/).filter(Boolean));
  let matches = (await classSites(files)).filter(
    (site) =>
      site.tag.toLowerCase() === tag.toLowerCase() &&
      site.classes.length > 0 &&
      site.classes.every((name) => inDom.has(name)),
  );

  if (matches.length > 1 && hint) {
    const byHint = matches.filter((site) =>
      site.source.slice(site.index, site.index + 400).includes(hint),
    );
    if (byHint.length > 0) matches = byHint;
  }
  if (matches.length > 1 && owner) {
    const declares = new RegExp(`(function|const|class)\\s+${owner}\\b`);
    const scoped = matches.filter((site) => declares.test(site.source));
    if (scoped.length > 0) matches = scoped;
  }
  if (matches.length > 1) {
    const best = Math.max(...matches.map((site) => site.classes.length));
    matches = matches.filter((site) => site.classes.length === best);
  }
  return matches.length === 1 ? matches[0] : null;
}

// Строка из контента рендерится как обычный текст, поэтому теги в неё класть
// нельзя — кладём markdown-маркеры, а элемент переводим на <RichText>, который
// эту разметку разбирает.
async function ensureRichText(
  files: string[],
  element: { tag?: string; className?: string; owner?: string },
  hint: string,
): Promise<{ wired?: string; reason?: string }> {
  const site = await bestSite(files, element, hint);
  if (!site) return { reason: 'не нашёл элемент в разметке' };

  const open = site.source.indexOf('>', site.insertAt);
  if (open === -1) return { reason: 'не разобрал разметку элемента' };
  const rest = site.source.slice(open + 1);
  if (rest.trimStart().startsWith('<RichText')) return { wired: 'уже включено' };

  // Единственный ребёнок вида {выражение} — только такой случай переписываем
  const child = rest.match(/^\s*\{([^{}]+)\}\s*<\//);
  if (!child) return { reason: 'у элемента не одно выражение внутри' };

  const from = open + 1 + (child[0].length - child[0].trimStart().length);
  const to = open + 1 + child[0].length - '</'.length;
  let updated =
    site.source.slice(0, from) + `<RichText text={${child[1].trim()}} />` + site.source.slice(to);

  if (!/import \{[^}]*RichText[^}]*\} from '@\/components\/markdown'/.test(updated)) {
    const lastImport = updated.lastIndexOf("\nimport ");
    const lineEnd = updated.indexOf('\n', lastImport + 1);
    updated =
      updated.slice(0, lineEnd) +
      "\nimport { RichText } from '@/components/markdown';" +
      updated.slice(lineEnd);
  }

  await writeFile(site.file, updated, 'utf8');
  return { wired: `${path.relative(ROOT, site.file)}:${lineOf(site.source, site.index)}` };
}

type PreLineResult = { styled?: string; already?: boolean; reason?: string };

async function ensurePreLine(
  files: string[],
  element: { tag?: string; className?: string; owner?: string },
  hint: string,
): Promise<PreLineResult> {
  const { tag, className, owner } = element;
  if (!tag || !className) return { reason: 'элемент не определён' };

  const wanted = className.split(/\s+/).filter(Boolean);
  const existing = wanted.find((name) => name.startsWith('whitespace-'));
  if (existing) {
    // Класс уже на месте (стили могли ещё не пересобраться) — делать нечего.
    // А вот nowrap/normal перенос гасят, об этом надо сказать.
    return /^whitespace-(pre|pre-line|pre-wrap)$/.test(existing)
      ? { already: true }
      : { reason: `на элементе стоит ${existing} — он гасит перенос` };
  }

  const inDom = new Set(wanted);
  let matches = (await classSites(files)).filter(
    (site) =>
      site.tag.toLowerCase() === tag.toLowerCase() &&
      site.classes.length > 0 &&
      site.classes.every((name) => inDom.has(name)),
  );

  // Сначала — по пути до контента: он стоит прямо в JSX рядом с элементом
  if (matches.length > 1 && hint) {
    const byHint = matches.filter((site) =>
      site.source.slice(site.index, site.index + 400).includes(hint),
    );
    if (byHint.length > 0) matches = byHint;
  }
  // Затем сужаем до файла с компонентом, который отрисовал элемент
  if (matches.length > 1 && owner) {
    const scoped = matches.filter((site) =>
      new RegExp(`(function|const|class)\\s+${owner}\\b`).test(site.source),
    );
    if (scoped.length > 0) matches = scoped;
  }
  // Затем — до самого полного совпадения по классам
  if (matches.length > 1) {
    const best = Math.max(...matches.map((site) => site.classes.length));
    matches = matches.filter((site) => site.classes.length === best);
  }

  if (matches.length !== 1) {
    return { reason: matches.length === 0 ? 'элемент не найден в исходниках' : 'нашлось несколько мест' };
  }

  const { file: target, source, index, insertAt } = matches[0];
  const insert = source.slice(0, insertAt) + ' whitespace-pre-line' + source.slice(insertAt);
  await writeFile(target, insert, 'utf8');
  return { styled: `${path.relative(ROOT, target)}:${lineOf(source, index)}` };
}

// Маркеры в разметку. Экранирование уже прошло, звёздочек оно не добавляет.
function emphasize(line: string): string {
  return line
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function joinLines(lines: string[], flavor: Flavor): string {
  if (flavor === 'jsx') return lines.join('<br />');
  if (flavor === 'literal') return lines.join('\\n');
  return lines.join('\n');
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return new Response(null, { status: 404 });
  }

  const { before, after, file, line, preservesNewlines, element, dryRun, path: pagePath, near, classes } =
    (await request.json()) as {
      before?: string;
      after?: string;
      file?: string;
      line?: number;
      preservesNewlines?: boolean;
      element?: { tag?: string; className?: string; owner?: string };
      dryRun?: boolean;
      path?: string;
      near?: string[];
      classes?: string[];
    };

  if (!before?.trim() || typeof after !== 'string') {
    return Response.json({ error: 'Нужны before и after' }, { status: 400 });
  }

  // Каждую строку схлопываем по обычным пробелам (не трогая неразрывные) и
  // прогоняем через nbsp(): для контента из lib это идемпотентно, для текста
  // прямо в JSX сразу расставляет U+00A0 по правилам. Пустые строки сохраняются.
  const lines = after.split('\n').map((value) => nbsp(value.replace(/[^\S ]+/g, ' ').trim()));

  const allFiles = SEARCH_DIRS.flatMap((dir) => collectFiles(path.join(ROOT, dir)));
  const files = file ? [path.join(ROOT, file)] : allFiles;

  const all: { file: string; source: string; matches: RegExpMatchArray[] }[] = [];
  for (const absolute of files) {
    const source = await readFile(absolute, 'utf8');
    const matches = [...source.matchAll(buildNeedle(before, /\.mdx?$/.test(absolute)))];
    if (matches.length > 0) all.push({ file: absolute, source, matches });
  }

  if (all.length === 0) {
    // Нашли текст с точностью до подстановки — значит правится только в коде
    const loose = await findLoose(allFiles, before);
    return Response.json(
      {
        error: loose
          ? 'Текст собран из переменных — целиком правится только в коде'
          : 'Текст не найден в исходниках: скорее всего приходит из базы',
        at: loose,
      },
      { status: 404 },
    );
  }

  const exact = all
    .map((hit) => ({ ...hit, matches: hit.matches.filter((m) => isExact(hit.source, m)) }))
    .filter((hit) => hit.matches.length > 0);
  const hits = exact.length > 0 ? exact : all;

  let candidates2: Candidate2[] = hits.flatMap((hit) =>
    hit.matches.map((match) => ({ file: hit.file, source: hit.source, match })),
  );

  // Комментарии, служебные атрибуты и metadata на странице не видны — не предлагаем их
  const commentsByFile = new Map<string, [number, number][]>();
  const renderable = candidates2.filter((item) => {
    if (!commentsByFile.has(item.file)) commentsByFile.set(item.file, commentRanges(item.source));
    return isRenderable(item.source, item.match.index ?? 0, commentsByFile.get(item.file)!);
  });
  if (renderable.length > 0) candidates2 = renderable;

  // Если страница уточнила файл и строку — берём именно это совпадение
  if (file && line) {
    const exactLine = candidates2.filter((item) => lineOf(item.source, item.match.index ?? 0) === line);
    if (exactLine.length > 0) candidates2 = exactLine;
  } else if (candidates2.length > 1) {
    candidates2 = await narrow(candidates2, allFiles, {
      path: pagePath,
      owner: element?.owner,
      near,
      classes,
      breaks: (before.match(/\n/g) ?? []).length,
    });
  }

  if (candidates2.length > 1 && !file) {
    const candidates: Candidate[] = candidates2.map((item) => ({
      file: path.relative(ROOT, item.file),
      line: lineOf(item.source, item.match.index ?? 0),
      preview: item.source
        .split('\n')[lineOf(item.source, item.match.index ?? 0) - 1].trim()
        .slice(0, 120),
    }));
    return Response.json({ error: 'Несколько совпадений', candidates }, { status: 409 });
  }

  const hit = candidates2[0];
  const match = hit.match;
  const index = match.index ?? 0;

  const { flavor, quote } = flavorAt(hit.file, hit.source, index);

  // Жирность и курсив в строке остаются markdown-маркерами: теги в неё класть
  // нельзя, они были бы видны на странице. Поэтому переводим элемент, который
  // эту строку рендерит, на <RichText> — он разметку разбирает.
  const emphasized = lines.some((value) => /\*\*.+?\*\*|\*.+?\*/.test(value));
  let wired: string | undefined;
  if (emphasized && flavor === 'literal') {
    const rich = await ensureRichText(allFiles, element ?? {}, contentPath(hit.source, index));
    if (!rich.wired) {
      return Response.json(
        {
          error: `Жирность в строке требует <RichText> на элементе, а его ${rich.reason}`,
          looked: `${element?.owner || '?'} → <${(element?.tag ?? '').toLowerCase()} class="${element?.className ?? ''}">`,
        },
        { status: 422 },
      );
    }
    wired = rich.wired;
  }
  if (emphasized && flavor === 'markdown') {
    // в .md разметка и так разбирается — маркеры пишем как есть
  }

  if (dryRun) {
    return Response.json({
      file: path.relative(ROOT, hit.file),
      line: lineOf(hit.source, index),
      flavor,
      dryRun: true,
    });
  }

  const replacement = joinLines(
    lines.map((value) => (flavor === 'jsx' ? emphasize(escapeLine(value, flavor, quote)) : escapeLine(value, flavor, quote))),
    flavor,
  );
  const updated = hit.source.slice(0, index) + replacement + hit.source.slice(index + match[0].length);
  await writeFile(hit.file, updated, 'utf8');

  // Если перенос попал в литерал, а элемент переводы строк не сохраняет —
  // дописываем ему whitespace-pre-line, иначе правка была бы не видна.
  const needsPreLine = lines.length > 1 && flavor === 'literal' && preservesNewlines === false;
  const preLine: PreLineResult =
    needsPreLine && element
      ? await ensurePreLine(allFiles, element, contentPath(hit.source, index))
      : {};

  return Response.json({
    file: path.relative(ROOT, hit.file),
    line: lineOf(hit.source, index),
    styled: preLine.styled,
    wired,
    warning:
      needsPreLine && !preLine.styled && !preLine.already
        ? `Перенос записан как \\n, но whitespace-pre-line не проставлен: ${preLine.reason}`
        : undefined,
    looked:
      needsPreLine && !preLine.styled && !preLine.already
        ? `${element?.owner || '?'} → <${(element?.tag ?? '').toLowerCase()} class="${element?.className ?? ''}">`
        : undefined,
  });
}
