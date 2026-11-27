# Карта проекта и ловушки

## Образцы
- **Страница практикума `/free`**: каталог `src/app/(app)/free/page.tsx`, страница отдельного урока `src/app/(app)/free/[slug]/page.tsx`, контент и список в `src/lib/free-lessons.ts` (запись `proverka-otvetov-ii` по #583).
- **Тест практикума**: `tests/free-lesson-ai-check-583.test.ts` (также `tests/free-lesson-gstack-572.test.ts`).
- **Тест с минимальной фикстурой**: список слагов/путей, `sourceSha256` и коммит источника вместо копии файла — см. `OLD_DISCOVERY` в `tests/free-lesson-ai-check-583.test.ts`, `MAIN_FREE_LESSONS` в `tests/free-lesson-gstack-572.test.ts` и `tests/fixtures/blog-2557bec-slugs.ts`.

## Ловушки
- Сьюты, импортирующие `src/app/sitemap.ts`, обязаны мокать `@/lib/db/reels` (`listPublishedReels`) — граница импортов #574 (образец мока: `tests/free-lesson-ai-check-583.test.ts`).
- Тест никогда не читает `origin/main` и `git` (#313/#324): замороженные данные фиксируются литералами в коде теста или минимальной фикстуры.
- `src/lib/blog.ts` и `src/lib/free-lessons.ts` — общие файлы, выкатка строго по одной задаче за раз.
- Автостатьи `agents/gelato-blog/` (инструкция `agents/gelato-blog/prompt.md`) не ломать.
- Слаги не менять, редиректы только 301.
- Платежи (`src/app/api/payments/`), авторизацию (`src/app/(auth)/`, `src/app/api/auth/`) и `firestore.rules` не трогать.

## Устаревшие шаблоны (антипаттерны)
- ⚠️ *Устарело*: копирование файлов целиком или больших текстов в фикстуры (например, замороженный markdown в `tests/explainer-lesson-links.test.ts` или дампы `blog.ts` на 200k+ diff) — заменять на минимальный список слагов, `sha256` и коммит источника.
- ⚠️ *Устарело*: чтение `git`/`origin/main` в рантайме тестов (#313) — заменять на литеральные константы в коде теста.
- ⚠️ *Устарело*: импорт `src/app/sitemap.ts` без мока `@/lib/db/reels` (#556/#574).

# Проектные инструкции

## Скиллы
- Для любых задач с анимациями и видео используй скилл `remotion-best-practices` (.claude/skills/remotion)
- Для UI/UX и визуального дизайна фронтенда используй скилл `ui-ux-pro-max` (.claude/skills/ui-ux-pro-max)
- Для любых спорных продуктовых решений (как лучше сделать элемент, текст, баннер, CTA) используй скилл `ab-testing` (.claude/skills/ab-testing): не угадывать, а заводить A/B-тест, потом сводка через `node scripts/ab-report.mjs`, решение принимает пользователь
  Сводка показывает конверсию после показа варианта, а не возвращение. Для выводов об удержании нужна отдельная проверка: [что считает сводка и как проверить возвращение](.claude/skills/ab-testing/SKILL.md#что-считает-сводка).
