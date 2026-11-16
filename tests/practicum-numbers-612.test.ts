import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { getStandaloneFreeLesson } from '@/lib/free-lessons';

const SLUG = 'kak-sdelan-rolik';

// Сверено с https://github.com/JuneYaooo/rea-video/blob/ebe853e330d63719a1f91754f789647c515eac19/README.md
// SHA-256 README: e9bf3baa46b5645de607e94f06f39ec2b50753f72264b87ff987e2eda3c0cbff.
// 15 минут на наш практикум в источнике не подтверждены. Номера разделов
// 1–3 и шагов 1–4 обозначают порядок упражнения, а не измерения rea-video.
const VERIFIED_NUMBERS = [
  { fragment: 'ролик на 19 секунд', source: 'README.md:80' },
  { fragment: 'в ролике 10 сцен', source: 'README.md:80' },
  { fragment: '8 секунд занимает настоящая запись экрана', source: 'README.md:81' },
  { fragment: 'рекламном ролике на 70 секунд', source: 'README.md:94' },
  { fragment: '83% к программной графике', source: 'README.md:95' },
  { fragment: '12% — к записи экрана', source: 'README.md:95' },
] as const;

// Первый абзац src/lib/free-lessons.ts:773 до #612, без завершающего перевода строки.
// SHA-256 считается по UTF-8 литерала; тест не читает git или внешние источники.
const OLD_INTRO = Object.freeze({
  sha256: '43f8273fd43612cfe274ee38ce776f88423a6f2ddf18aa7ec8b35645f2f7ddbe',
  text: 'Для практикума хватит 15 минут, этого текста и заметок. Посмотрите готовый пример, разберите его части и запишите план своей версии. В части про ИИ нужно только описать сцену на бумаге.',
});

function expectNoUnverifiedNumbers(text: string) {
  expect(text).not.toMatch(/\b15\b/u);
}

describe('проверенные цифры практикума «Как сделан ролик» #612', () => {
  it('не содержит неподтверждённой длительности в тексте и описаниях', () => {
    const lesson = getStandaloneFreeLesson(SLUG);
    expect(lesson).not.toBeNull();
    expectNoUnverifiedNumbers([
      lesson!.h1, lesson!.lead, lesson!.seoTitle, lesson!.seoDescription, lesson!.body,
    ].join('\n'));
  });

  it.each(VERIFIED_NUMBERS)('сохраняет «$fragment» ($source)', ({ fragment }) => {
    expect(getStandaloneFreeLesson(SLUG)?.body).toContain(fragment);
  });

  it('тот же критерий отклоняет старый фрагмент с зафиксированным SHA-256', () => {
    expect(createHash('sha256').update(OLD_INTRO.text, 'utf8').digest('hex')).toBe(OLD_INTRO.sha256);
    expect(() => expectNoUnverifiedNumbers(OLD_INTRO.text)).toThrow(/15/);
  });
});
