/**
 * Расписание потоков курса «Инженерный вайбкодинг» (it-vibecoding).
 *
 * Базовая дата старта потока: 21 сентября 2026 года.
 * Механизм автоматического переноса:
 * При приближении к дате за 1 день (т.е. за 1 календарный день до старта, в воскресенье перед понедельником,
 * либо если дата уже наступила/прошла), дата потока автоматически переключается на 7 дней вперед.
 */

export const VIBECODING_BASE_STREAM_DATE = new Date('2026-09-21T00:00:00+03:00');

function getMoscowDayTimestamp(date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const str = formatter.format(date);
  const [y, m, d] = str.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

const RU_DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Moscow',
});

/**
 * Вычисляет дату ближайшего активного потока.
 * При приближении к текущей дате потока за 1 день (diffDays <= advanceNoticeDays),
 * дата сдвигается на 7 дней вперед до тех пор, пока до старта не останется более 1 дня.
 */
export function getNextStreamDate(
  now: Date = new Date(),
  baseDate: Date = VIBECODING_BASE_STREAM_DATE,
  advanceNoticeDays: number = 1,
): Date {
  let stream = new Date(baseDate.getTime());
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

  const nowDay = getMoscowDayTimestamp(now);

  // Быстрый перенос прошедших недель, если now далеко в будущем
  const initialStreamDay = getMoscowDayTimestamp(stream);
  if (nowDay > initialStreamDay) {
    const pastWeeks = Math.floor((nowDay - initialStreamDay) / sevenDaysMs);
    if (pastWeeks > 0) {
      stream = new Date(stream.getTime() + pastWeeks * sevenDaysMs);
    }
  }

  while (true) {
    const streamDay = getMoscowDayTimestamp(stream);
    const diffDays = Math.round((streamDay - nowDay) / oneDayMs);

    if (diffDays <= advanceNoticeDays) {
      stream = new Date(stream.getTime() + sevenDaysMs);
    } else {
      break;
    }
  }

  return stream;
}

/**
 * Форматирует дату потока на русском языке (например, «21 сентября», «28 сентября», «5 октября»).
 */
export function formatStreamDate(date: Date): string {
  return RU_DATE_FORMATTER.format(date);
}

/**
 * Возвращает строковую дату старта ближайшего потока для отображения на лендинге, в тарифах и письмах.
 */
export function getStreamStartDate(
  now?: Date,
  baseDate?: Date,
  advanceNoticeDays?: number,
): string {
  return formatStreamDate(getNextStreamDate(now, baseDate, advanceNoticeDays));
}
