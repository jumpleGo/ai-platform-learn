// Типографика русского текста. Контент лежит в обычных строках, а правила вёрстки
// одинаковые для всех страниц — поэтому неразрывные пробелы расставляются один раз
// на границе контента (nbspDeep), а не руками в каждом абзаце.

// Слова, которые не должны оставаться в конце строки
const SHORT_WORDS = [
  'и', 'а', 'в', 'с', 'к', 'о', 'у', 'я',
  'на', 'по', 'за', 'из', 'от', 'до', 'во', 'со', 'об', 'не', 'ни', 'но', 'то',
  'мы', 'вы', 'ты', 'он', 'их', 'им', 'её', 'да', 'уж',
  'как', 'для', 'без', 'под', 'над', 'при', 'про', 'же', 'бы', 'ли', 'что',
];

const SHORT_RE = new RegExp(
  // перед словом — начало строки, пробел или открывающая кавычка/скобка
  `(^|[\\s("«])(${SHORT_WORDS.join('|')})\\s+`,
  'gi',
);

const NBSP = ' ';

export function nbsp(input: string): string {
  return input
    .replace(SHORT_RE, `$1$2${NBSP}`)
    // тире не начинает строку: неразрывный пробел перед знаком
    .replace(/\s+([—–])/g, `${NBSP}$1`)
    // число не отрывается от единицы измерения и от разряда
    .replace(/(\d)\s+(?=[0-9А-Яа-яЁёA-Za-z₽%])/g, `$1${NBSP}`);
}

// Рекурсивно прогоняет строки объекта через nbsp. Ключи и структура не меняются,
// поэтому применять можно к готовому контенту целиком.
export function nbspDeep<T>(value: T): T {
  if (typeof value === 'string') return nbsp(value) as T;
  if (Array.isArray(value)) return value.map(nbspDeep) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = nbspDeep(v);
    return out as T;
  }
  return value;
}
