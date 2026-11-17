# Причина падения выкатки #689 (задача #716)

## Шаг 1: CI
CI_LOG=unavailable: `gh run view 44041104793 --log-failed` и `--log` вернули пустой вывод (rc=0, 0 строк).
Прогон: 44041104793, "hq: merge задачи 689 (hq/vera/689)", Build & Push Docker image, main, 2026-11-17T07:45:08Z — 07:46:14Z, failure.
Упал шаг "Build and push". Аннотация (дословно, это всё, что отдаёт gh вместо журнала):

    buildx failed with: ERROR: failed to build: failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1

Текста ошибки самой сборки (последних 40 строк) получить не удалось.
Для сравнения: прогон 44041289671 (откат) — success; 44036649626 (#690) — success.

## Шаг 2: локальная `npx next build` на коммите 163cd08
Результат: BUILD_RC=1. Хвост вывода (весь, 8 строк):

    ▲ Next.js 16.2.9 (Turbopack)
    - Experiments (use with caution):
      · serverActions


    > Build error occurred
    Error: Both middleware file "./src/src/middleware.ts" and proxy file "./src/src/proxy.ts" are detected. Please use "./src/src/proxy.ts" only. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
        at ignore-listed frames

Причина: код (BUILD_FAIL_CAUSE=code). Коммит 776c86e (#689) добавил src/middleware.ts, а в main уже есть src/proxy.ts (Next 16 запрещает оба).
Это совпадает с аннотацией CI (`npm run build` exit code 1), хотя журнал CI недоступен.

## Исправление
- src/middleware.ts перенесён в src/lib/analytics/crawler-visit.ts (`trackCrawlerVisit`, фильтр путей /llms.txt и /blog/* внутри).
- src/proxy.ts вызывает `trackCrawlerVisit(req, event)`; сигнатура `proxy(req, event)`.
- tests/crawler-visit-middleware.test.ts: импорты переключены на новый модуль и proxy. Проверки события для 4 ботов, браузера, сбоя fetch сохранены. Проверка matcher заменена проверкой пути внутри функции, а проверка ответа теперь идёт через proxy. Ничего не удалено и не ослаблено по смыслу.

Повторная `npx next build` после правки: rc=0. Первый запуск упёрся в мой таймаут 170 с (rc=124) на этапе TypeScript, второй (с кэшем) прошёл.
Хвост (последние строки): `ƒ Proxy (Middleware)`, список маршрутов, `○ (Static)`, `ƒ (Dynamic)`.
Целевые тесты: tests/bot-detection.test.ts и tests/crawler-visit-middleware.test.ts — 2 файла, 37 тестов, все прошли.
