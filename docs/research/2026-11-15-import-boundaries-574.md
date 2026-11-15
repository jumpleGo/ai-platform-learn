# #574 — исследование границы серверных импортов, шаг 0

Дата: 2026-11-15. Рабочая копия: `/home/painsearchdev/agent-hq/workspaces/vera/574`; ветка: `hq/vera/574`; исследованный HEAD: `56c7582e2f01ee37eb47222956c2a1bab47b27c1`.

Результат: **22 модуля с server-only, 73 нарушения по формальному критерию этого прогона, FIX_NEEDED=yes**. Это 61 строка в src/ и 12 строк в tests/. Новый тест можно сделать на существующих devDependencies. Тест и исправление в этом шаге не реализованы.

Гипотеза задачи: статическая проверка границы обнаружит серверные зависимости в общих страницах до падения чужих тестов, сократив отказы при выпуске ленты и страниц роликов. Влияние на retention_w1 и поведение в проде в исследовании не измерялись.

## Ограничения и исходное состояние

Первой командой выполнено `df -B1 --output=avail "$HOME"`: доступно **14679830528 Б**, порог **1610612736 Б** пройден.

```text
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        49G   34G   14G  71% /home/painsearchdev/agent-hq/workspaces/vera/574
/dev/sda1        49G   34G   14G  71% /
```

Выполнено `git ls-files`: подтверждено 603 отслеживаемых файлов. Исходный `git status --porcelain --untracked-files=all` пустой. Приоритет имеет инструкция шага 0: слияние origin/main, установки, npm ci, tsc, vitest и next build не выполнялись. В рабочую копию записан только этот отчёт.

`AGENTS.md` прочитан. Каталог `node_modules/next/dist/docs/` отсутствует (проверено через rg); установленного TypeScript тоже нет. Прикладной код и тесты не писались, зависимости не устанавливались. Исследование основано на git grep и чтении исходников; вспомогательный разбор текста выполнялся из stdin, без запуска модулей приложения и без сохранения скриптов.

## Поиск server-only

Точное выражение:

```sh
git grep -n "server-only" -- src/
```

Полный результат поиска (включает комментарии):

```text
src/lib/access.ts:1:// Чистая функция доступа — без server-only, нужна и в тестах
src/lib/ai.ts:1:import 'server-only';
src/lib/analytics/posthog-server.ts:1:import 'server-only';
src/lib/banners.ts:2:// Модуль чистый (без 'server-only') — используется и на странице урока, и в админке.
src/lib/db/admin-courses.ts:1:import 'server-only';
src/lib/db/banner-stats.ts:1:import 'server-only';
src/lib/db/courses.ts:1:import 'server-only';
src/lib/db/grants.ts:1:import 'server-only';
src/lib/db/leads.ts:1:import 'server-only';
src/lib/db/partners.ts:1:import 'server-only';
src/lib/db/progress.ts:1:import 'server-only';
src/lib/db/reels.ts:1:import 'server-only';
src/lib/db/stats.ts:1:import 'server-only';
src/lib/db/subscriptions.ts:1:import 'server-only';
src/lib/db/users.ts:1:import 'server-only';
src/lib/email/mailer.ts:1:import 'server-only';
src/lib/firebase/admin.ts:1:import 'server-only';
src/lib/leads.ts:3:// и тип — по нему видно, куда писать. Модуль без 'server-only': валидация нужна и на
src/lib/markdown.ts:2:// Чистые функции (без server-only) — рендерит компонент Markdown, тестируются отдельно.
src/lib/payments/tbank.ts:1:import 'server-only';
src/lib/reel-upload.ts:1:import 'server-only';
src/lib/reels-availability.ts:1:import 'server-only';
src/lib/require-admin.ts:1:import 'server-only';
src/lib/session.ts:1:import 'server-only';
src/lib/site.ts:3:// Модуль без 'server-only' — используется и в клиентских компонентах.
src/lib/slug.ts:2:// Модуль без 'server-only' — используется и в клиентских компонентах (ссылки на карточках).
src/lib/storage.ts:1:import 'server-only';
src/lib/video-meta.ts:1:import 'server-only';
src/lib/video-url.ts:1:// Чистая функция — без server-only, нужна и в тестах
```

Для списка модулей учитывается только настоящий side-effect import, а не упоминание в комментарии:

```sh
git grep -n -E "^[[:space:]]*import[[:space:]]*['\"]server-only['\"]" -- src/
```

```text
src/lib/ai.ts:1
src/lib/analytics/posthog-server.ts:1
src/lib/db/admin-courses.ts:1
src/lib/db/banner-stats.ts:1
src/lib/db/courses.ts:1
src/lib/db/grants.ts:1
src/lib/db/leads.ts:1
src/lib/db/partners.ts:1
src/lib/db/progress.ts:1
src/lib/db/reels.ts:1
src/lib/db/stats.ts:1
src/lib/db/subscriptions.ts:1
src/lib/db/users.ts:1
src/lib/email/mailer.ts:1
src/lib/firebase/admin.ts:1
src/lib/payments/tbank.ts:1
src/lib/reel-upload.ts:1
src/lib/reels-availability.ts:1
src/lib/require-admin.ts:1
src/lib/session.ts:1
src/lib/storage.ts:1
src/lib/video-meta.ts:1
```

## Правило подсчёта

Единица baseline — уникальная строка runtime import/export, разрешающаяся в один из 22 модулей. Для src/ проверяется непосредственный обратный импорт из tests/ либо из файла с 'use client', а также принадлежность самого импортёра к sitemap/layout или lib без маркера. Прямые runtime-импорты в tests/ включены как корневой случай. Импорт одного файла несколькими тестами не умножает нарушение.

| Метка | Критерий | Строк |
| --- | --- | ---: |
| TEST_ROOT | Сам файл находится в tests/ и делает runtime-импорт. | 12 |
| TEST_IMPORTER | Импортёр непосредственно загружается из tests/ (включая importActual и import.meta.glob). | 34 |
| CLIENT_IMPORTER | Импортёр непосредственно подключён файлом с директивой 'use client'. | 17 |
| SHARED_ENTRY | Импорт находится в sitemap.ts или layout.tsx. | 9 |
| UNMARKED_LIB | Импорт находится в src/lib/ без собственного import 'server-only'. | 5 |

Категории пересекаются; сумма по категориям не является BASELINE_VIOLATIONS_N. В частности, `src/lib/db/courses.ts:4` и `src/lib/db/reels.ts:3` включены: сами эти server-only импортёры непосредственно импортируются тестами. Более глубокие внутренние server→server рёбра не добавляются повторно только из-за транзитивной достижимости. Это явная граница двухшагового аудита; она не моделирует исполнение всего приложения.

`import type`, `export type`, типовые `typeof import(...)`, комментарии, текстовые фикстуры и регистрация `vi.mock('путь', ...)` не являются runtime-импортом. Смешанный импорт значений и типов учитывается. Наличие mock для реально импортируемого модуля не убирает ребро из статического baseline.

Все 17 строк CLIENT_IMPORTER находятся в файлах с 'use server'. По строгой формулировке прогона они включены в baseline, но сама такая связь с Server Action не доказывает попадание реализации в клиентский bundle. Аналогично, тесты серверных модулей с mock могут быть намеренными. Это причины для точечных исключений; фактическое падение тестов или утечка серверного кода в браузер здесь не утверждаются.

Пути разрешены с учётом `@/* → ./src/*` из tsconfig.json, относительных импортов, расширений и index-файлов. Для обратных связей дополнительно прочитаны вызовы `vi.importActual` и `import.meta.glob`; без glob были бы пропущены два импортёра с четырьмя нарушениями.

## Нарушения — одна строка на место импорта

```text
src/app/(app)/(home)/page.tsx:3
src/app/(app)/(home)/page.tsx:4
src/app/(app)/(home)/page.tsx:5
src/app/(app)/(home)/page.tsx:21
src/app/(app)/actions.ts:3
src/app/(app)/actions.ts:4
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions.ts:2
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions.ts:3
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions.ts:4
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/layout.tsx:2
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:6
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:7
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:8
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:9
src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:1
src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:2
src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:3
src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:4
src/app/(app)/courses/[courseSlug]/page.tsx:8
src/app/(app)/courses/[courseSlug]/page.tsx:9
src/app/(app)/courses/[courseSlug]/page.tsx:10
src/app/(app)/courses/[courseSlug]/page.tsx:11
src/app/(app)/free/page.tsx:6
src/app/(app)/layout.tsx:4
src/app/(app)/layout.tsx:5
src/app/(auth)/actions.ts:3
src/app/(auth)/actions.ts:5
src/app/(auth)/actions.ts:7
src/app/@structuredData/[...path]/page.tsx:2
src/app/admin/courses/actions.ts:4
src/app/admin/courses/actions.ts:5
src/app/admin/courses/actions.ts:6
src/app/admin/courses/actions.ts:7
src/app/admin/courses/actions.ts:8
src/app/admin/courses/actions.ts:10
src/app/admin/courses/actions.ts:11
src/app/admin/layout.tsx:5
src/app/admin/reels/actions.ts:4
src/app/admin/reels/actions.ts:5
src/app/admin/reels/page.tsx:3
src/app/admin/reels/page.tsx:4
src/app/api/admin/reels/[reelId]/route.ts:2
src/app/api/admin/reels/[reelId]/route.ts:3
src/app/api/admin/reels/[reelId]/upload/route.ts:2
src/app/api/admin/reels/[reelId]/upload/route.ts:3
src/app/api/admin/reels/[reelId]/upload/route.ts:4
src/app/api/admin/reels/[reelId]/upload/route.ts:5
src/app/llms.txt/route.ts:1
src/app/llms.txt/route.ts:8
src/app/reels/page.tsx:4
src/app/reels/page.tsx:5
src/app/sitemap.ts:2
src/components/site-footer.tsx:5
src/components/site-nav.tsx:1
src/lib/db/courses.ts:4
src/lib/db/payments.ts:1
src/lib/db/payments.ts:2
src/lib/db/payments.ts:3
src/lib/db/payments.ts:4
src/lib/db/payments.ts:7
src/lib/db/reels.ts:3
tests/blog-discoverability.test.ts:6
tests/blog-lesson-next-step.test.tsx:8
tests/blog-start-here.test.ts:3
tests/breadcrumbs.test.tsx:9
tests/geo-intro-lesson.test.tsx:8
tests/geo-llms-routes.test.ts:5
tests/lesson-next-link.test.tsx:8
tests/lesson-seo.test.ts:2
tests/reel-upload.test.ts:2
tests/reels-admin.test.tsx:4
tests/reels-data.test.ts:2
tests/reels-fields-555.test.ts:6
```

Расшифровка каждой строки и непосредственное свидетельство (при нескольких потребителях приведён один; полный список ниже):

| Файл:строка | Цель | Основание | Свидетельство |
| --- | --- | --- | --- |
| `src/app/(app)/(home)/page.tsx:3` | `@/lib/db/courses` | TEST_IMPORTER | `tests/beginner-questions.test.tsx:6` |
| `src/app/(app)/(home)/page.tsx:4` | `@/lib/db/subscriptions` | TEST_IMPORTER | `tests/beginner-questions.test.tsx:6` |
| `src/app/(app)/(home)/page.tsx:5` | `@/lib/session` | TEST_IMPORTER | `tests/beginner-questions.test.tsx:6` |
| `src/app/(app)/(home)/page.tsx:21` | `@/lib/reels-availability` | TEST_IMPORTER | `tests/beginner-questions.test.tsx:6` |
| `src/app/(app)/actions.ts:3` | `@/lib/db/stats` | CLIENT_IMPORTER | `src/components/lead-capture.tsx:6` |
| `src/app/(app)/actions.ts:4` | `@/lib/db/leads` | CLIENT_IMPORTER | `src/components/lead-capture.tsx:6` |
| `src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions.ts:2` | `@/lib/session` | CLIENT_IMPORTER | `src/components/complete-lesson-button.tsx:6` |
| `src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions.ts:3` | `@/lib/db/progress` | CLIENT_IMPORTER | `src/components/complete-lesson-button.tsx:6` |
| `src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions.ts:4` | `@/lib/db/stats` | CLIENT_IMPORTER | `src/components/complete-lesson-button.tsx:6` |
| `src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/layout.tsx:2` | `@/lib/db/courses` | TEST_IMPORTER, SHARED_ENTRY | `tests/lesson-404.test.tsx:11` |
| `src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:6` | `@/lib/db/courses` | TEST_IMPORTER | `tests/breadcrumbs.test.tsx:4` |
| `src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:7` | `@/lib/db/subscriptions` | TEST_IMPORTER | `tests/breadcrumbs.test.tsx:4` |
| `src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:8` | `@/lib/db/progress` | TEST_IMPORTER | `tests/breadcrumbs.test.tsx:4` |
| `src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:9` | `@/lib/session` | TEST_IMPORTER | `tests/breadcrumbs.test.tsx:4` |
| `src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:1` | `@/lib/db/courses` | SHARED_ENTRY | Общий entrypoint |
| `src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:2` | `@/lib/db/subscriptions` | SHARED_ENTRY | Общий entrypoint |
| `src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:3` | `@/lib/db/progress` | SHARED_ENTRY | Общий entrypoint |
| `src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:4` | `@/lib/session` | SHARED_ENTRY | Общий entrypoint |
| `src/app/(app)/courses/[courseSlug]/page.tsx:8` | `@/lib/db/courses` | TEST_IMPORTER | `tests/beginner-questions.test.tsx:7` |
| `src/app/(app)/courses/[courseSlug]/page.tsx:9` | `@/lib/db/subscriptions` | TEST_IMPORTER | `tests/beginner-questions.test.tsx:7` |
| `src/app/(app)/courses/[courseSlug]/page.tsx:10` | `@/lib/db/progress` | TEST_IMPORTER | `tests/beginner-questions.test.tsx:7` |
| `src/app/(app)/courses/[courseSlug]/page.tsx:11` | `@/lib/session` | TEST_IMPORTER | `tests/beginner-questions.test.tsx:7` |
| `src/app/(app)/free/page.tsx:6` | `@/lib/db/courses` | TEST_IMPORTER | `tests/free-intro-lesson.test.tsx:4` |
| `src/app/(app)/layout.tsx:4` | `@/lib/session` | SHARED_ENTRY | Общий entrypoint |
| `src/app/(app)/layout.tsx:5` | `@/lib/db/stats` | SHARED_ENTRY | Общий entrypoint |
| `src/app/(auth)/actions.ts:3` | `@/lib/firebase/admin` | CLIENT_IMPORTER | `src/app/(auth)/login/page.tsx:13` |
| `src/app/(auth)/actions.ts:5` | `@/lib/db/grants` | CLIENT_IMPORTER | `src/app/(auth)/login/page.tsx:13` |
| `src/app/(auth)/actions.ts:7` | `@/lib/analytics/posthog-server` | CLIENT_IMPORTER | `src/app/(auth)/login/page.tsx:13` |
| `src/app/@structuredData/[...path]/page.tsx:2` | `@/lib/db/courses` | TEST_IMPORTER | `tests/breadcrumbs.test.tsx:7` |
| `src/app/admin/courses/actions.ts:4` | `@/lib/firebase/admin` | CLIENT_IMPORTER | `src/app/admin/courses/materials-editor.tsx:9` |
| `src/app/admin/courses/actions.ts:5` | `@/lib/db/courses` | CLIENT_IMPORTER | `src/app/admin/courses/materials-editor.tsx:9` |
| `src/app/admin/courses/actions.ts:6` | `@/lib/require-admin` | CLIENT_IMPORTER | `src/app/admin/courses/materials-editor.tsx:9` |
| `src/app/admin/courses/actions.ts:7` | `@/lib/storage` | CLIENT_IMPORTER | `src/app/admin/courses/materials-editor.tsx:9` |
| `src/app/admin/courses/actions.ts:8` | `@/lib/video-meta` | CLIENT_IMPORTER | `src/app/admin/courses/materials-editor.tsx:9` |
| `src/app/admin/courses/actions.ts:10` | `@/lib/ai` | CLIENT_IMPORTER | `src/app/admin/courses/materials-editor.tsx:9` |
| `src/app/admin/courses/actions.ts:11` | `@/lib/db/banner-stats` | CLIENT_IMPORTER | `src/app/admin/courses/materials-editor.tsx:9` |
| `src/app/admin/layout.tsx:5` | `@/lib/session` | SHARED_ENTRY | Общий entrypoint |
| `src/app/admin/reels/actions.ts:4` | `@/lib/require-admin` | TEST_IMPORTER, CLIENT_IMPORTER | `src/app/admin/reels/reel-upload-form.tsx:6` |
| `src/app/admin/reels/actions.ts:5` | `@/lib/db/reels` | TEST_IMPORTER, CLIENT_IMPORTER | `src/app/admin/reels/reel-upload-form.tsx:6` |
| `src/app/admin/reels/page.tsx:3` | `@/lib/db/reels` | TEST_IMPORTER | `tests/reels-controls-543.test.tsx:6` |
| `src/app/admin/reels/page.tsx:4` | `@/lib/require-admin` | TEST_IMPORTER | `tests/reels-controls-543.test.tsx:6` |
| `src/app/api/admin/reels/[reelId]/route.ts:2` | `@/lib/require-admin` | TEST_IMPORTER | `tests/reels-management-543.test.ts:19` (import.meta.glob) |
| `src/app/api/admin/reels/[reelId]/route.ts:3` | `@/lib/db/reels` | TEST_IMPORTER | `tests/reels-management-543.test.ts:19` (import.meta.glob) |
| `src/app/api/admin/reels/[reelId]/upload/route.ts:2` | `@/lib/require-admin` | TEST_IMPORTER | `tests/reel-upload.test.ts:3` |
| `src/app/api/admin/reels/[reelId]/upload/route.ts:3` | `@/lib/firebase/admin` | TEST_IMPORTER | `tests/reel-upload.test.ts:3` |
| `src/app/api/admin/reels/[reelId]/upload/route.ts:4` | `@/lib/db/reels` | TEST_IMPORTER | `tests/reel-upload.test.ts:3` |
| `src/app/api/admin/reels/[reelId]/upload/route.ts:5` | `@/lib/reel-upload` | TEST_IMPORTER | `tests/reel-upload.test.ts:3` |
| `src/app/llms.txt/route.ts:1` | `@/lib/db/courses` | TEST_IMPORTER | `tests/blog-discoverability.test.ts:3` |
| `src/app/llms.txt/route.ts:8` | `@/lib/reels-availability` | TEST_IMPORTER | `tests/blog-discoverability.test.ts:3` |
| `src/app/reels/page.tsx:4` | `@/lib/db/reels` | TEST_IMPORTER | `tests/reels-public.test.tsx:35` (import.meta.glob) |
| `src/app/reels/page.tsx:5` | `@/lib/firebase/admin` | TEST_IMPORTER | `tests/reels-public.test.tsx:35` (import.meta.glob) |
| `src/app/sitemap.ts:2` | `@/lib/db/courses` | TEST_IMPORTER, SHARED_ENTRY | `tests/blog-ai-code-review.test.tsx:5` |
| `src/components/site-footer.tsx:5` | `@/lib/reels-availability` | TEST_IMPORTER | `tests/reels-controls-543.test.tsx:7` |
| `src/components/site-nav.tsx:1` | `@/lib/reels-availability` | TEST_IMPORTER | `tests/reels-links-548.test.tsx:7` |
| `src/lib/db/courses.ts:4` | `@/lib/firebase/admin` | TEST_IMPORTER | `tests/blog-discoverability.test.ts:6` |
| `src/lib/db/payments.ts:1` | `@/lib/firebase/admin` | UNMARKED_LIB | Нет server-only |
| `src/lib/db/payments.ts:2` | `@/lib/db/users` | UNMARKED_LIB | Нет server-only |
| `src/lib/db/payments.ts:3` | `@/lib/db/grants` | UNMARKED_LIB | Нет server-only |
| `src/lib/db/payments.ts:4` | `@/lib/email/mailer` | UNMARKED_LIB | Нет server-only |
| `src/lib/db/payments.ts:7` | `@/lib/analytics/posthog-server` | UNMARKED_LIB | Нет server-only |
| `src/lib/db/reels.ts:3` | `@/lib/firebase/admin` | TEST_IMPORTER | `tests/reels-data.test.ts:2` |
| `tests/blog-discoverability.test.ts:6` | `@/lib/db/courses` | TEST_ROOT | Сам тест |
| `tests/blog-lesson-next-step.test.tsx:8` | `@/lib/db/courses` | TEST_ROOT | Сам тест |
| `tests/blog-start-here.test.ts:3` | `@/lib/db/courses` | TEST_ROOT | Сам тест |
| `tests/breadcrumbs.test.tsx:9` | `@/lib/db/courses` | TEST_ROOT | Сам тест |
| `tests/geo-intro-lesson.test.tsx:8` | `@/lib/db/courses` | TEST_ROOT | Сам тест |
| `tests/geo-llms-routes.test.ts:5` | `@/lib/db/courses` | TEST_ROOT | Сам тест |
| `tests/lesson-next-link.test.tsx:8` | `@/lib/db/courses` | TEST_ROOT | Сам тест |
| `tests/lesson-seo.test.ts:2` | `@/lib/db/courses` | TEST_ROOT | Сам тест |
| `tests/reel-upload.test.ts:2` | `@/lib/reel-upload` | TEST_ROOT | Сам тест |
| `tests/reels-admin.test.tsx:4` | `@/lib/reel-upload` | TEST_ROOT | Сам тест |
| `tests/reels-data.test.ts:2` | `@/lib/db/reels` | TEST_ROOT | Сам тест |
| `tests/reels-fields-555.test.ts:6` | `@/lib/db/reels` | TEST_ROOT | Сам тест |

## Обратные импорты из tests/ и use client

В следующих строках слева — потребитель, справа — импортёр server-only модуля. Это вспомогательные свидетельства, а не дополнительные элементы baseline.

```text
src/app/(auth)/login/page.tsx:13 -> src/app/(auth)/actions.ts
src/app/(auth)/register/page.tsx:12 -> src/app/(auth)/actions.ts
src/app/admin/courses/materials-editor.tsx:9 -> src/app/admin/courses/actions.ts
src/app/admin/reels/reel-upload-form.tsx:6 -> src/app/admin/reels/actions.ts
src/components/complete-lesson-button.tsx:6 -> src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions.ts
src/components/lead-capture.tsx:6 -> src/app/(app)/actions.ts
tests/beginner-questions.test.tsx:6 -> src/app/(app)/(home)/page.tsx
tests/beginner-questions.test.tsx:7 -> src/app/(app)/courses/[courseSlug]/page.tsx
tests/blog-ai-code-review.test.tsx:5 -> src/app/sitemap.ts
tests/blog-claude-md.test.tsx:7 -> src/app/sitemap.ts
tests/blog-confident-numbers.test.tsx:5 -> src/app/sitemap.ts
tests/blog-discoverability.test.ts:2 -> src/app/sitemap.ts
tests/blog-discoverability.test.ts:3 -> src/app/llms.txt/route.ts
tests/blog-discoverability.test.ts:6 -> src/lib/db/courses.ts
tests/blog-foreign-command.test.tsx:8 -> src/app/sitemap.ts
tests/blog-lesson-next-step.test.tsx:6 -> src/app/sitemap.ts
tests/blog-lesson-next-step.test.tsx:8 -> src/lib/db/courses.ts
tests/blog-start-here.test.ts:3 -> src/lib/db/courses.ts
tests/breadcrumbs.test.tsx:4 -> src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx
tests/breadcrumbs.test.tsx:6 -> src/app/(app)/courses/[courseSlug]/page.tsx
tests/breadcrumbs.test.tsx:7 -> src/app/@structuredData/[...path]/page.tsx
tests/breadcrumbs.test.tsx:9 -> src/lib/db/courses.ts
tests/course-beginner-accordion.test.tsx:4 -> src/app/(app)/courses/[courseSlug]/page.tsx
tests/course-landing-answers.test.tsx:4 -> src/app/(app)/courses/[courseSlug]/page.tsx
tests/course-landing-links.test.ts:4 -> src/app/(app)/courses/[courseSlug]/page.tsx
tests/free-intro-lesson.test.tsx:4 -> src/app/(app)/free/page.tsx
tests/geo-explainers.test.ts:3 -> src/app/sitemap.ts
tests/geo-intro-lesson.test.tsx:5 -> src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx
tests/geo-intro-lesson.test.tsx:8 -> src/lib/db/courses.ts
tests/geo-llms-routes.test.ts:4 -> src/app/llms.txt/route.ts
tests/geo-llms-routes.test.ts:5 -> src/lib/db/courses.ts
tests/honest-course-landing.test.tsx:3 -> src/app/(app)/courses/[courseSlug]/page.tsx
tests/honest-course-landing.test.tsx:4 -> src/app/@structuredData/[...path]/page.tsx
tests/landing-lesson-cta.test.tsx:4 -> src/app/(app)/courses/[courseSlug]/page.tsx
tests/lesson-404.test.tsx:11 -> src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/layout.tsx
tests/lesson-links.test.ts:4 -> src/app/(app)/(home)/page.tsx
tests/lesson-next-link.test.tsx:6 -> src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx
tests/lesson-next-link.test.tsx:8 -> src/lib/db/courses.ts
tests/lesson-seo.test.ts:2 -> src/lib/db/courses.ts
tests/lesson-seo.test.ts:3 -> src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx
tests/lesson-seo.test.ts:4 -> src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/layout.tsx
tests/lesson-seo.test.ts:5 -> src/app/sitemap.ts
tests/reel-upload.test.ts:3 -> src/app/api/admin/reels/[reelId]/upload/route.ts
tests/reels-admin.test.tsx:3 -> src/app/api/admin/reels/[reelId]/upload/route.ts
tests/reels-controls-543.test.tsx:6 -> src/app/admin/reels/page.tsx
tests/reels-controls-543.test.tsx:7 -> src/components/site-footer.tsx
tests/reels-data.test.ts:2 -> src/lib/db/reels.ts
tests/reels-fields-555.test.ts:6 -> src/lib/db/reels.ts
tests/reels-fields-555.test.ts:7 -> src/app/admin/reels/actions.ts
tests/reels-links-548.test.tsx:4 -> src/app/(app)/(home)/page.tsx
tests/reels-links-548.test.tsx:5 -> src/app/llms.txt/route.ts
tests/reels-links-548.test.tsx:6 -> src/components/site-footer.tsx
tests/reels-links-548.test.tsx:7 -> src/components/site-nav.tsx
tests/reels-public.test.tsx:7 -> src/app/sitemap.ts
tests/text-blocks-528.test.tsx:5 -> src/app/(app)/free/page.tsx
tests/text-blocks-528.test.tsx:6 -> src/app/(app)/courses/[courseSlug]/page.tsx
tests/reels-admin.test.tsx:161 -> src/app/admin/reels/actions.ts [vi.importActual]
tests/reels-admin.test.tsx:167 -> src/app/admin/reels/actions.ts [vi.importActual]
tests/reels-public.test.tsx:35 -> src/app/reels/page.tsx [import.meta.glob]
tests/reels-management-543.test.ts:19 -> src/app/api/admin/reels/[reelId]/route.ts [import.meta.glob]
tests/course-schema.test.tsx:28 -> src/app/@structuredData/[...path]/page.tsx [import.meta.glob]
```

Полный поиск glob, включая два остальных вызова, не добавляющих новых мест нарушений:

```text
tests/course-schema.test.tsx:28:const slots = import.meta.glob('../src/app/@structuredData/[...path]/page.tsx', { eager: true });
tests/geo-llms-routes.test.ts:14:const fullRoutes = import.meta.glob('../src/app/llms-full.txt/route.ts', { eager: true });
tests/reels-management-543.test.ts:19:const modules = import.meta.glob('../src/app/api/admin/reels/*/route.ts', { eager: true });
tests/reels-public.test.tsx:35:const pages = import.meta.glob('../src/app/reels/page.tsx', { eager: true });
```

## Возможность проверки без новых зависимостей

Команда и результат:

```text
git grep -n '"typescript"' package.json
package.json:45:    "typescript": "^5",
```

`typescript: ^5` находится именно в devDependencies; там же уже есть `vitest: ^4.1.8`. В vitest.config.ts настроен alias @ на src. Поэтому **TS_API_AVAILABLE=yes** означает доступность TypeScript API из уже объявленной зависимости, без изменения package.json/lockfile. **TS_RUNTIME_AVAILABLE=no** в этой рабочей копии: `require.resolve('typescript')` вернул MODULE_NOT_FOUND. Наличие установленного пакета и успешный запуск теста не заявляются.

Регулярное выражение пригодно для первичной инвентаризации текущих import/export; для постоянной проверки предпочтителен TypeScript AST: он различает строки, комментарии, type-only и многострочные объявления. AST и node:fs/node:path/node:crypto не требуют новых зависимостей. dependency-cruiser и eslint-plugin-boundaries не нужны.

План теста — 5 строк (работа следующего шага):

1. В `tests/import-boundaries.test.ts` читать src/ и tests/ через node:fs, разбирать текст `typescript.createSourceFile`; исходные модули приложения не исполнять.
2. Собрать value import/export, литеральные import()/require(), vi.importActual и имеющиеся import.meta.glob, разрешить alias/relative/index, построить обратные связи и применить пять критериев выше; type-only, комментарии и vi.mock-регистрации пропустить.
3. Хранить 73 точечных исходных исключения в `tests/fixtures/import-boundaries-baseline-574.json` как importer + resolved target + вид ребра + причина + допустимое число вхождений; строки использовать для диагностики, не разрешать целый sitemap/каталог и выявлять новые либо устаревшие исключения.
4. В самом тесте заморозить приведённый ниже литеральный UTF-8 фрагмент из 2b3f421 с завершающим LF, commit и SHA256; передать его парсеру как `src/app/sitemap.ts`, проверить диагностику строки 3 → `@/lib/db/reels` даже при исключении для строки 2 → db/courses; git из теста не читать.
5. Проверить отдельными примерами alias/relative/re-export/многострочный импорт, отрицательные случаи type-only/комментарий/строка и точность исключения; запускать vitest только в следующем разрешённом прогоне после восстановления окружения.

## Замороженный фрагмент #556

Фрагмент получен требуемой командой:

```sh
git show 2b3f421:src/app/sitemap.ts | head -10
```

```ts
import type { MetadataRoute } from 'next';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { listPublishedReels } from '@/lib/db/reels';
import { trainingCourses } from '@/lib/catalog';
import { courseKey, lessonPath } from '@/lib/slug';
import { SITE_URL } from '@/lib/site';
import { BLOG_POSTS, blogPostUrl } from '@/lib/blog';

// Карта строится по данным Firestore, а доступа к базе на сборке нет
// (креды приходят из .env на сервере), поэтому генерируем на запросе.
```

Хешируется ровно вывод команды: 10 строк в UTF-8, LF после каждой строки, включая последнюю; пустая строка 8 входит в хеш.

```sh
git show 2b3f421:src/app/sitemap.ts | head -10 | sha256sum
```

```text
e7b7584774f4f633c7f895a06b9bbc9e09a415a18757bc1b94c4044a97cd812f  -
```

В исследованном HEAD импорт db/reels в sitemap отсутствует; уже существующее ребро `src/app/sitemap.ts:2 → @/lib/db/courses` входит в baseline. Поэтому исключение только для db/courses не должно разрешать новый импорт db/reels из исторического фрагмента.

## Полные git grep для каждого server-only модуля

Ниже сохранены все найденные употребления точного alias-пути, включая type-only, vi.mock и конфигурационные строки; это сырая выдача для проверки полноты. В baseline попали только runtime-рёбра по критериям выше. Все 22 команды завершились с кодом 0. Дополнительный поиск по относительным написаниям и разбор import/export не выявили других runtime-импортов этих 22 модулей.

### src/lib/ai.ts

```sh
git grep -n -F '@/lib/ai' -- src/ tests/
```

```text
src/app/admin/courses/actions.ts:10:import { formatMaterials } from '@/lib/ai';
```

### src/lib/analytics/posthog-server.ts

```sh
git grep -n -F '@/lib/analytics/posthog-server' -- src/ tests/
```

```text
src/app/(auth)/actions.ts:7:import { trackServer } from '@/lib/analytics/posthog-server';
src/app/admin/users/actions.ts:11:import { trackServer } from '@/lib/analytics/posthog-server';
src/app/api/webhooks/payment/route.ts:3:import { trackServer } from '@/lib/analytics/posthog-server';
src/lib/db/payments.ts:7:import { trackServer } from '@/lib/analytics/posthog-server';
```

### src/lib/db/admin-courses.ts

```sh
git grep -n -F '@/lib/db/admin-courses' -- src/ tests/
```

```text
src/app/admin/courses/[courseId]/page.tsx:12:import { getCourseWithLessons } from '@/lib/db/admin-courses';
src/app/admin/courses/page.tsx:11:import { listAllCourses } from '@/lib/db/admin-courses';
src/app/admin/users/actions.ts:8:import { listAllCourses } from '@/lib/db/admin-courses';
src/app/admin/users/page.tsx:12:import { listAllCourses } from '@/lib/db/admin-courses';
```

### src/lib/db/banner-stats.ts

```sh
git grep -n -F '@/lib/db/banner-stats' -- src/ tests/
```

```text
src/app/admin/courses/[courseId]/page.tsx:14:import { getLessonBannerStats, type BannerStat } from '@/lib/db/banner-stats';
src/app/admin/courses/actions.ts:11:import { resetLessonBannerStats } from '@/lib/db/banner-stats';
src/app/api/banner-stats/route.ts:3:import { recordBannerClick, recordBannerShown } from '@/lib/db/banner-stats';
```

### src/lib/db/courses.ts

```sh
git grep -n -F '@/lib/db/courses' -- src/ tests/
```

```text
src/app/(app)/(home)/page.tsx:3:import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/layout.tsx:2:import { resolveLesson } from '@/lib/db/courses';
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:6:import { getPublishedCoursesWithLessons, resolveLesson } from '@/lib/db/courses';
src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:1:import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
src/app/(app)/courses/[courseSlug]/page.tsx:8:import { getPublishedCoursesWithLessons, type CourseWithLessons } from '@/lib/db/courses';
src/app/(app)/courses/page.tsx:2:import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
src/app/(app)/free/page.tsx:6:import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
src/app/(app)/waitlist/[courseSlug]/page.tsx:6:import { getTestCourse } from '@/lib/db/courses';
src/app/@structuredData/[...path]/page.tsx:2:import { getPublishedCoursesWithLessons, resolveLesson } from '@/lib/db/courses';
src/app/admin/courses/actions.ts:5:import { invalidateCatalog } from '@/lib/db/courses';
src/app/api/payments/init/route.ts:6:import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
src/app/api/player/[courseId]/[lessonId]/route.ts:1:import { resolveLesson } from '@/lib/db/courses';
src/app/llms.txt/route.ts:1:import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
src/app/sitemap.ts:2:import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
src/components/beginner-questions.tsx:2:import type { CourseWithLessons } from '@/lib/db/courses';
src/lib/catalog.ts:4:import type { CourseWithLessons } from '@/lib/db/courses';
tests/beginner-questions.test.tsx:4:import type { CourseWithLessons } from '@/lib/db/courses';
tests/beginner-questions.test.tsx:13:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: catalog }));
tests/blog-ai-code-review.test.tsx:9:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
tests/blog-claude-md.test.tsx:14:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
tests/blog-confident-numbers.test.tsx:9:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
tests/blog-discoverability.test.ts:6:import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
tests/blog-discoverability.test.ts:9:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn() }));
tests/blog-foreign-command.test.tsx:12:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
tests/blog-lesson-next-step.test.tsx:8:import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
tests/blog-lesson-next-step.test.tsx:15:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn() }));
tests/blog-start-here.test.ts:3:import { getPublishedCoursesWithLessons as getCatalog, type CourseWithLessons, type NumberedLesson } from '@/lib/db/courses';
tests/blog-start-here.test.ts:6:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn() }));
tests/breadcrumbs.test.tsx:9:import { getPublishedCoursesWithLessons, resolveLesson, type CourseWithLessons } from '@/lib/db/courses';
tests/breadcrumbs.test.tsx:14:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn(), resolveLesson: vi.fn() }));
tests/course-beginner-accordion.test.tsx:8:vi.mock('@/lib/db/courses', () => ({
tests/course-landing-answers.test.tsx:3:import type { CourseWithLessons } from '@/lib/db/courses';
tests/course-landing-answers.test.tsx:9:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: catalog }));
tests/course-landing-links.test.ts:7:import type { CourseWithLessons } from '@/lib/db/courses';
tests/course-landing-links.test.ts:25:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => catalog }));
tests/course-schema.test.tsx:20:vi.mock('@/lib/db/courses', () => ({
tests/free-intro-lesson.test.tsx:13:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
tests/geo-explainers.test.ts:5:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn().mockResolvedValue([]) }));
tests/geo-intro-lesson.test.tsx:8:import { getPublishedCoursesWithLessons, resolveLesson, type CourseWithLessons } from '@/lib/db/courses';
tests/geo-intro-lesson.test.tsx:13:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn(), resolveLesson: vi.fn() }));
tests/geo-llms-routes.test.ts:5:import { getPublishedCoursesWithLessons, type CourseWithLessons } from '@/lib/db/courses';
tests/geo-llms-routes.test.ts:8:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn() }));
tests/honest-course-landing.test.tsx:6:import type { CourseWithLessons } from '@/lib/db/courses';
tests/honest-course-landing.test.tsx:9:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: catalog }));
tests/landing-lesson-cta.test.tsx:5:import type { CourseWithLessons } from '@/lib/db/courses';
tests/landing-lesson-cta.test.tsx:10:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: catalog }));
tests/lesson-404.test.tsx:9:vi.mock('@/lib/db/courses', () => ({ resolveLesson: (...a: unknown[]) => resolveLesson(...a) }));
tests/lesson-links.test.ts:6:import type { CourseWithLessons } from '@/lib/db/courses';
tests/lesson-links.test.ts:24:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => catalog }));
tests/lesson-next-link.test.tsx:8:import { getPublishedCoursesWithLessons, resolveLesson, type CourseWithLessons } from '@/lib/db/courses';
tests/lesson-next-link.test.tsx:11:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: vi.fn(), resolveLesson: vi.fn() }));
tests/lesson-seo.test.ts:2:import { getPublishedCoursesWithLessons, resolveLesson, type CourseWithLessons } from '@/lib/db/courses';
tests/lesson-seo.test.ts:7:vi.mock('@/lib/db/courses', () => ({
tests/prepare-lesson-http.mjs:27:  '@/lib/db/courses': ['./tests/fixtures/lesson-http.ts'],
tests/reels-links-548.test.tsx:13:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: async () => [] }));
tests/reels-public.test.tsx:29:vi.mock('@/lib/db/courses', () => ({ getPublishedCoursesWithLessons: mocks.catalog }));
tests/text-blocks-528.test.tsx:7:import type { CourseWithLessons } from '@/lib/db/courses';
tests/text-blocks-528.test.tsx:12:vi.mock('@/lib/db/courses', () => ({
```

### src/lib/db/grants.ts

```sh
git grep -n -F '@/lib/db/grants' -- src/ tests/
```

```text
src/app/(auth)/actions.ts:5:import { claimPendingGrant } from '@/lib/db/grants';
src/app/admin/users/actions.ts:6:} from '@/lib/db/grants';
src/app/admin/users/page.tsx:13:import { listPendingGrants } from '@/lib/db/grants';
src/app/api/payments/init/route.ts:5:import { normalizeEmail } from '@/lib/db/grants';
src/lib/db/payments.ts:3:import { applyGrantToUser, savePendingGrant, normalizeEmail } from '@/lib/db/grants';
```

### src/lib/db/leads.ts

```sh
git grep -n -F '@/lib/db/leads' -- src/ tests/
```

```text
src/app/(app)/actions.ts:4:import { createLead } from '@/lib/db/leads';
src/app/admin/leads/page.tsx:5:import { listLeads } from '@/lib/db/leads';
```

### src/lib/db/partners.ts

```sh
git grep -n -F '@/lib/db/partners' -- src/ tests/
```

```text
src/app/admin/partners/actions.ts:4:import { deletePartner, invalidatePartners, savePartner } from '@/lib/db/partners';
src/app/admin/partners/page.tsx:10:import { countUsersByPartner, listPartners } from '@/lib/db/partners';
src/app/admin/users/page.tsx:11:import { listPartners } from '@/lib/db/partners';
src/components/partner-bar.tsx:4:import { getPartnerBySlug } from '@/lib/db/partners';
```

### src/lib/db/progress.ts

```sh
git grep -n -F '@/lib/db/progress' -- src/ tests/
```

```text
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions.ts:3:import { markLessonCompleted } from '@/lib/db/progress';
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:8:import { getCompletedLessonIds } from '@/lib/db/progress';
src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:3:import { getCompletedLessonIds } from '@/lib/db/progress';
src/app/(app)/courses/[courseSlug]/page.tsx:10:import { getCompletedLessonIds } from '@/lib/db/progress';
tests/beginner-questions.test.tsx:16:vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn() }));
tests/breadcrumbs.test.tsx:17:vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn(), markLessonCompleted: vi.fn() }));
tests/course-beginner-accordion.test.tsx:17:vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn() }));
tests/course-landing-answers.test.tsx:12:vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn() }));
tests/course-landing-links.test.ts:28:vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn() }));
tests/geo-intro-lesson.test.tsx:16:vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn(), markLessonCompleted: vi.fn() }));
tests/honest-course-landing.test.tsx:12:vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn() }));
tests/landing-lesson-cta.test.tsx:13:vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn() }));
tests/lesson-next-link.test.tsx:14:vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn(), markLessonCompleted: vi.fn() }));
tests/lesson-seo.test.ts:12:vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn(), markLessonCompleted: vi.fn() }));
tests/text-blocks-528.test.tsx:21:vi.mock('@/lib/db/progress', () => ({ getCompletedLessonIds: vi.fn() }));
```

### src/lib/db/reels.ts

```sh
git grep -n -F '@/lib/db/reels' -- src/ tests/
```

```text
src/app/admin/reels/actions.ts:5:import { createReel, updateReelMetadata } from '@/lib/db/reels';
src/app/admin/reels/page.tsx:3:import { listAllReels, listReelCourses } from '@/lib/db/reels';
src/app/api/admin/reels/[reelId]/route.ts:3:import { deleteReel, ReelMutationError, setReelPublished } from '@/lib/db/reels';
src/app/api/admin/reels/[reelId]/upload/route.ts:4:import { getReel, setReelVideoPath } from '@/lib/db/reels';
src/app/reels/page.tsx:4:import { listPublishedReels } from '@/lib/db/reels';
src/lib/reels-availability.ts:3:import { listPublishedReels } from '@/lib/db/reels';
tests/beginner-questions.test.tsx:12:vi.mock('@/lib/db/reels', () => ({ listPublishedReels: async () => [] }));
tests/blog-discoverability.test.ts:11:vi.mock('@/lib/db/reels', () => ({ listPublishedReels: async () => [] }));
tests/geo-llms-routes.test.ts:10:vi.mock('@/lib/db/reels', () => ({ listPublishedReels: async () => [] }));
tests/lesson-links.test.ts:23:vi.mock('@/lib/db/reels', () => ({ listPublishedReels: async () => [] }));
tests/reel-upload.test.ts:9:vi.mock('@/lib/db/reels', () => ({ getReel, setReelVideoPath }));
tests/reels-admin.test.tsx:13:vi.mock('@/lib/db/reels', () => ({ getReel: s.get, setReelVideoPath: s.attach, createReel: s.create, updateReelMetadata: s.update }));
tests/reels-controls-543.test.tsx:15:vi.mock('@/lib/db/reels', () => ({
tests/reels-data.test.ts:2:import { createReel, getReel, listPublishedReels, setReelVideoPath } from '@/lib/db/reels';
tests/reels-fields-555.test.ts:6:import { createReel, getReel, listAllReels, listPublishedReels, updateReelMetadata } from '@/lib/db/reels';
tests/reels-links-548.test.tsx:12:vi.mock('@/lib/db/reels', () => ({ listPublishedReels: mocks.listPublishedReels }));
```

### src/lib/db/stats.ts

```sh
git grep -n -F '@/lib/db/stats' -- src/ tests/
```

```text
src/app/(app)/actions.ts:3:import { incrementTestCourseClick } from '@/lib/db/stats';
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions.ts:4:import { recordLessonView } from '@/lib/db/stats';
src/app/(app)/layout.tsx:5:import { getRegisteredUsersCount } from '@/lib/db/stats';
tests/breadcrumbs.test.tsx:18:vi.mock('@/lib/db/stats', () => ({ recordLessonView: vi.fn() }));
tests/geo-intro-lesson.test.tsx:17:vi.mock('@/lib/db/stats', () => ({ recordLessonView: vi.fn() }));
tests/lesson-next-link.test.tsx:15:vi.mock('@/lib/db/stats', () => ({ recordLessonView: vi.fn() }));
tests/lesson-seo.test.ts:13:vi.mock('@/lib/db/stats', () => ({ recordLessonView: vi.fn() }));
tests/prepare-lesson-http.mjs:28:  '@/lib/db/stats': ['./tests/fixtures/lesson-http.ts'],
```

### src/lib/db/subscriptions.ts

```sh
git grep -n -F '@/lib/db/subscriptions' -- src/ tests/
```

```text
src/app/(app)/(home)/page.tsx:4:import { getSubscription } from '@/lib/db/subscriptions';
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:7:import { getSubscription } from '@/lib/db/subscriptions';
src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:2:import { getSubscription } from '@/lib/db/subscriptions';
src/app/(app)/courses/[courseSlug]/page.tsx:9:import { getSubscription } from '@/lib/db/subscriptions';
src/app/admin/users/actions.ts:3:import { expireSubscription } from '@/lib/db/subscriptions';
src/app/api/cron/expire/route.ts:2:import { expireOverdueSubscriptions } from '@/lib/db/subscriptions';
src/app/api/player/[courseId]/[lessonId]/route.ts:2:import { getSubscription } from '@/lib/db/subscriptions';
src/app/api/webhooks/payment/route.ts:1:import { grantSubscription } from '@/lib/db/subscriptions';
src/lib/db/grants.ts:3:import { grantSubscription } from '@/lib/db/subscriptions';
tests/beginner-questions.test.tsx:15:vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
tests/breadcrumbs.test.tsx:16:vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
tests/course-beginner-accordion.test.tsx:16:vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
tests/course-landing-answers.test.tsx:11:vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
tests/course-landing-links.test.ts:27:vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
tests/geo-intro-lesson.test.tsx:15:vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
tests/honest-course-landing.test.tsx:11:vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
tests/landing-lesson-cta.test.tsx:12:vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
tests/lesson-links.test.ts:26:vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
tests/lesson-next-link.test.tsx:13:vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
tests/lesson-seo.test.ts:11:vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
tests/reels-links-548.test.tsx:14:vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
tests/text-blocks-528.test.tsx:20:vi.mock('@/lib/db/subscriptions', () => ({ getSubscription: vi.fn() }));
```

### src/lib/db/users.ts

```sh
git grep -n -F '@/lib/db/users' -- src/ tests/
```

```text
src/app/admin/users/actions.ts:7:import { findUserByEmail } from '@/lib/db/users';
src/app/admin/users/page.tsx:10:import { listUsers } from '@/lib/db/users';
src/lib/db/payments.ts:2:import { findUserByEmail } from '@/lib/db/users';
```

### src/lib/email/mailer.ts

```sh
git grep -n -F '@/lib/email/mailer' -- src/ tests/
```

```text
src/lib/db/payments.ts:4:import { sendSelfPacedAccessEmail, sendSupportStreamEnrollmentEmail } from '@/lib/email/mailer';
```

### src/lib/firebase/admin.ts

```sh
git grep -n -F '@/lib/firebase/admin' -- src/ tests/
```

```text
src/app/(auth)/actions.ts:3:import { adminAuth, adminDb } from '@/lib/firebase/admin';
src/app/admin/courses/actions.ts:4:import { adminDb } from '@/lib/firebase/admin';
src/app/api/admin/reels/[reelId]/upload/route.ts:3:import { adminStorage, storageBucketName } from '@/lib/firebase/admin';
src/app/api/auth/session/route.ts:2:import { adminAuth } from '@/lib/firebase/admin';
src/app/reels/page.tsx:5:import { adminStorage, storageBucketName } from '@/lib/firebase/admin';
src/components/partner-bar.tsx:3:import { adminDb } from '@/lib/firebase/admin';
src/lib/db/admin-courses.ts:2:import { adminDb } from '@/lib/firebase/admin';
src/lib/db/banner-stats.ts:3:import { adminDb } from '@/lib/firebase/admin';
src/lib/db/courses.ts:4:import { adminDb } from '@/lib/firebase/admin';
src/lib/db/grants.ts:2:import { adminDb } from '@/lib/firebase/admin';
src/lib/db/leads.ts:2:import { adminDb } from '@/lib/firebase/admin';
src/lib/db/partners.ts:3:import { adminDb } from '@/lib/firebase/admin';
src/lib/db/payments.ts:1:import { adminAuth, adminDb } from '@/lib/firebase/admin';
src/lib/db/progress.ts:2:import { adminDb } from '@/lib/firebase/admin';
src/lib/db/reels.ts:3:import { adminDb, adminStorage, storageBucketName } from '@/lib/firebase/admin';
src/lib/db/stats.ts:4:import { adminDb } from '@/lib/firebase/admin';
src/lib/db/subscriptions.ts:2:import { adminDb } from '@/lib/firebase/admin';
src/lib/db/users.ts:2:import { adminDb } from '@/lib/firebase/admin';
src/lib/session.ts:4:import { adminAuth } from '@/lib/firebase/admin';
src/lib/storage.ts:3:import { adminStorage, storageBucketName } from '@/lib/firebase/admin';
tests/reel-upload.test.ts:10:vi.mock('@/lib/firebase/admin', () => ({ adminStorage: { bucket }, storageBucketName: 'test-bucket' }));
tests/reels-admin.test.tsx:14:vi.mock('@/lib/firebase/admin', () => ({ adminStorage: { bucket: s.bucket }, storageBucketName: 'test-bucket' }));
tests/reels-controls-543.test.tsx:13:vi.mock('@/lib/firebase/admin', () => ({}));
tests/reels-data.test.ts:8:vi.mock('@/lib/firebase/admin', () => ({ adminDb: { collection } }));
tests/reels-fields-555.test.ts:15:vi.mock('@/lib/firebase/admin', () => ({ adminDb: { collection: s.collection } }));
tests/reels-management-543.test.ts:12:vi.mock('@/lib/firebase/admin', () => ({
tests/reels-public.test.tsx:18:vi.mock('@/lib/firebase/admin', () => ({
```

### src/lib/payments/tbank.ts

```sh
git grep -n -F '@/lib/payments/tbank' -- src/ tests/
```

```text
src/app/api/payments/init/route.ts:3:import { initTBankPayment } from '@/lib/payments/tbank';
src/app/api/payments/status/route.ts:2:import { getTBankState } from '@/lib/payments/tbank';
src/app/api/payments/webhook/route.ts:2:import { generateTBankToken } from '@/lib/payments/tbank';
```

### src/lib/reel-upload.ts

```sh
git grep -n -F '@/lib/reel-upload' -- src/ tests/
```

```text
src/app/api/admin/reels/[reelId]/upload/route.ts:5:import { readReelUpload, ReelUploadError } from '@/lib/reel-upload';
tests/reel-upload.test.ts:2:import { MAX_REEL_BYTES, readReelUpload as read } from '@/lib/reel-upload';
tests/reels-admin.test.tsx:4:import { MAX_REEL_BYTES } from '@/lib/reel-upload';
```

### src/lib/reels-availability.ts

```sh
git grep -n -F '@/lib/reels-availability' -- src/ tests/
```

```text
src/app/(app)/(home)/page.tsx:21:import { hasPublishedReels } from '@/lib/reels-availability';
src/app/llms.txt/route.ts:8:import { hasPublishedReels } from '@/lib/reels-availability';
src/components/site-footer.tsx:5:import { hasPublishedReels } from '@/lib/reels-availability';
src/components/site-nav.tsx:1:import { hasPublishedReels } from '@/lib/reels-availability';
```

### src/lib/require-admin.ts

```sh
git grep -n -F '@/lib/require-admin' -- src/ tests/
```

```text
src/app/admin/courses/actions.ts:6:import { requireAdmin } from '@/lib/require-admin';
src/app/admin/partners/actions.ts:3:import { requireAdmin } from '@/lib/require-admin';
src/app/admin/reels/actions.ts:4:import { requireAdmin } from '@/lib/require-admin';
src/app/admin/reels/page.tsx:4:import { requireAdmin } from '@/lib/require-admin';
src/app/admin/users/actions.ts:9:import { requireAdmin } from '@/lib/require-admin';
src/app/api/admin/reels/[reelId]/route.ts:2:import { requireAdmin } from '@/lib/require-admin';
src/app/api/admin/reels/[reelId]/upload/route.ts:2:import { requireAdmin } from '@/lib/require-admin';
tests/reels-admin.test.tsx:12:vi.mock('@/lib/require-admin', () => ({ requireAdmin: s.guard }));
tests/reels-controls-543.test.tsx:12:vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn() }));
tests/reels-fields-555.test.ts:16:vi.mock('@/lib/require-admin', () => ({ requireAdmin: s.guard }));
```

### src/lib/session.ts

```sh
git grep -n -F '@/lib/session' -- src/ tests/
```

```text
src/app/(app)/(home)/page.tsx:5:import { getSession } from '@/lib/session';
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions.ts:2:import { getSession } from '@/lib/session';
src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:9:import { getSession } from '@/lib/session';
src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:4:import { getSession } from '@/lib/session';
src/app/(app)/courses/[courseSlug]/page.tsx:11:import { getSession } from '@/lib/session';
src/app/(app)/layout.tsx:4:import { getSession } from '@/lib/session';
src/app/admin/layout.tsx:5:import { getSession } from '@/lib/session';
src/app/api/player/[courseId]/[lessonId]/route.ts:3:import { getSession } from '@/lib/session';
src/components/partner-bar.tsx:2:import { getSession } from '@/lib/session';
src/lib/require-admin.ts:2:import { getSession } from '@/lib/session';
tests/beginner-questions.test.tsx:14:vi.mock('@/lib/session', () => ({ getSession: async () => null }));
tests/breadcrumbs.test.tsx:15:vi.mock('@/lib/session', () => ({ getSession: async () => null }));
tests/course-beginner-accordion.test.tsx:15:vi.mock('@/lib/session', () => ({ getSession: async () => null }));
tests/course-landing-answers.test.tsx:10:vi.mock('@/lib/session', () => ({ getSession: async () => null }));
tests/course-landing-links.test.ts:26:vi.mock('@/lib/session', () => ({ getSession: async () => null }));
tests/geo-intro-lesson.test.tsx:14:vi.mock('@/lib/session', () => ({ getSession: async () => null }));
tests/honest-course-landing.test.tsx:10:vi.mock('@/lib/session', () => ({ getSession: async () => null }));
tests/landing-lesson-cta.test.tsx:11:vi.mock('@/lib/session', () => ({ getSession: async () => null }));
tests/lesson-links.test.ts:25:vi.mock('@/lib/session', () => ({ getSession: async () => null }));
tests/lesson-next-link.test.tsx:12:vi.mock('@/lib/session', () => ({ getSession: async () => null }));
tests/lesson-seo.test.ts:10:vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));
tests/reel-upload.test.ts:8:vi.mock('@/lib/session', () => ({ getSession }));
tests/reels-links-548.test.tsx:15:vi.mock('@/lib/session', () => ({ getSession: async () => null }));
tests/reels-management-543.test.ts:10:vi.mock('@/lib/session', () => ({ getSession: s.session }));
tests/reels-public.test.tsx:30:vi.mock('@/lib/session', () => ({ getSession: mocks.session }));
tests/text-blocks-528.test.tsx:19:vi.mock('@/lib/session', () => ({ getSession: async () => null }));
```

### src/lib/storage.ts

```sh
git grep -n -F '@/lib/storage' -- src/ tests/
```

```text
src/app/admin/courses/actions.ts:7:import { uploadPreview } from '@/lib/storage';
```

### src/lib/video-meta.ts

```sh
git grep -n -F '@/lib/video-meta' -- src/ tests/
```

```text
src/app/admin/courses/actions.ts:8:import { fetchVideoDuration } from '@/lib/video-meta';
```

## Решение по заранее заданному порогу

`FIX_NEEDED=no` только при одновременном выполнении `BASELINE_VIOLATIONS_N=0` и отсутствии способа без новых зависимостей (`PLAN_NO_NEW_DEPS=no`); во всех остальных случаях `FIX_NEEDED=yes`.

Измерено BASELINE_VIOLATIONS_N=73; PLAN_NO_NEW_DEPS=yes. Следовательно FIX_NEEDED=yes. Это решение о необходимости следующего шага, а не разрешение выполнять его в этом прогоне.

Проверки этого шага: перечень git grep, сопоставление строк и обратных импортов, SHA256 исходных десяти строк, проверка единственного документа в diff. RED_ON_OLD, TSC, TESTS, NEXT_BUILD, ROUTE_MODE и проверка продакшена: NA — запрещены/не предусмотрены инструкцией шага 0.

```text
SERVER_ONLY_MODULES_N=22
BASELINE_VIOLATIONS_N=73
VIOLATIONS_LIST=src/app/(app)/(home)/page.tsx:3;src/app/(app)/(home)/page.tsx:4;src/app/(app)/(home)/page.tsx:5;src/app/(app)/(home)/page.tsx:21;src/app/(app)/actions.ts:3;src/app/(app)/actions.ts:4;src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions.ts:2;src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions.ts:3;src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/actions.ts:4;src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/layout.tsx:2;src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:6;src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:7;src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:8;src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:9;src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:1;src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:2;src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:3;src/app/(app)/courses/[courseSlug]/lessons/layout.tsx:4;src/app/(app)/courses/[courseSlug]/page.tsx:8;src/app/(app)/courses/[courseSlug]/page.tsx:9;src/app/(app)/courses/[courseSlug]/page.tsx:10;src/app/(app)/courses/[courseSlug]/page.tsx:11;src/app/(app)/free/page.tsx:6;src/app/(app)/layout.tsx:4;src/app/(app)/layout.tsx:5;src/app/(auth)/actions.ts:3;src/app/(auth)/actions.ts:5;src/app/(auth)/actions.ts:7;src/app/@structuredData/[...path]/page.tsx:2;src/app/admin/courses/actions.ts:4;src/app/admin/courses/actions.ts:5;src/app/admin/courses/actions.ts:6;src/app/admin/courses/actions.ts:7;src/app/admin/courses/actions.ts:8;src/app/admin/courses/actions.ts:10;src/app/admin/courses/actions.ts:11;src/app/admin/layout.tsx:5;src/app/admin/reels/actions.ts:4;src/app/admin/reels/actions.ts:5;src/app/admin/reels/page.tsx:3;src/app/admin/reels/page.tsx:4;src/app/api/admin/reels/[reelId]/route.ts:2;src/app/api/admin/reels/[reelId]/route.ts:3;src/app/api/admin/reels/[reelId]/upload/route.ts:2;src/app/api/admin/reels/[reelId]/upload/route.ts:3;src/app/api/admin/reels/[reelId]/upload/route.ts:4;src/app/api/admin/reels/[reelId]/upload/route.ts:5;src/app/llms.txt/route.ts:1;src/app/llms.txt/route.ts:8;src/app/reels/page.tsx:4;src/app/reels/page.tsx:5;src/app/sitemap.ts:2;src/components/site-footer.tsx:5;src/components/site-nav.tsx:1;src/lib/db/courses.ts:4;src/lib/db/payments.ts:1;src/lib/db/payments.ts:2;src/lib/db/payments.ts:3;src/lib/db/payments.ts:4;src/lib/db/payments.ts:7;src/lib/db/reels.ts:3;tests/blog-discoverability.test.ts:6;tests/blog-lesson-next-step.test.tsx:8;tests/blog-start-here.test.ts:3;tests/breadcrumbs.test.tsx:9;tests/geo-intro-lesson.test.tsx:8;tests/geo-llms-routes.test.ts:5;tests/lesson-next-link.test.tsx:8;tests/lesson-seo.test.ts:2;tests/reel-upload.test.ts:2;tests/reels-admin.test.tsx:4;tests/reels-data.test.ts:2;tests/reels-fields-555.test.ts:6
TS_API_AVAILABLE=yes
FIXTURE_SHA256=e7b7584774f4f633c7f895a06b9bbc9e09a415a18757bc1b94c4044a97cd812f
PLAN_NO_NEW_DEPS=yes
FIX_NEEDED=yes
```

Commit этого отчёта, сырой итоговый git status и фактическое ELAPSED_MIN фиксируются в ответе после коммита; документ не может содержать собственный конечный commit hash.
