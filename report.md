Разведка #969: lesson_view и lesson_opened

Общий ответ: POSSIBLE=no для надёжного расчёта открытия урока 1 → открытия урока 2 по собственным свойствам этих событий для любого курса. Исключение — бесплатные уроки 1–5 курса claude-code: lesson_view уже содержит номер в строковом lesson_id. Наличие двух разных названий событий само по себе не восполняет отсутствие номера в lesson_opened.

Рабочая копия: /home/painsearchdev/agent-hq/workspaces/vera/969
Ветка: hq/vera/969
FREE_BYTES=26005180416; минимальный порог 1610612736 соблюдён.
ENGINE_ACTUAL=GPT-6 (Codex; точный идентификатор варианта среда не раскрывает).
Лимит разведки 10–15 минут соблюдён. Сеть, сервер метаданных и облачные токены не использовались.

Основание проверено командой stat: [отчёт #966](/home/painsearchdev/agent-hq/workspaces/vera/966/report.md:3) существует, размер 30684 байта; на строке 3 записано «Итог: POSSIBLE=no». Вывод текущего отчёта проверен по текущей рабочей копии, а не принят из #966 без проверки.

Разрешённые изменения проекта: []. Пересечение разрешённых изменений с чужими задачами: [], поскольку правок проекта нет. Единственная разрешённая запись — запрошенный артефакт /home/painsearchdev/agent-hq/workspaces/vera/969/report.md. FILES=[] и DIFF_BYTES=0 ниже относятся к изменениям проекта, отчёт остаётся отдельным untracked-артефактом. Соседняя копия #966 только прочитана. Исходный git status был пустым.

1. Все существующие места отправки и свойства

Полный текстовый поиск выполнен по рабочей копии с исключением node_modules, .git, сборок и запрещённых путей; отдельно повторён поиск по src/, tests/, scripts/ с --no-ignore. Найдены два места формирования событий. Других прямых вызовов, обращений через EVENTS.lessonViewed / EVENTS.lessonOpened или подключений этих отправителей в приложении не найдено.

| Событие | Место формирования / отправки | Явные свойства и типы |
|---|---|---|
| lesson_view | [src/components/free-lesson-analytics.tsx:23](/home/painsearchdev/agent-hq/workspaces/vera/969/src/components/free-lesson-analytics.tsx:23): track(EVENTS.lessonViewed, {...}), payload на строках 24–29 | courseId: string; lessonDocumentId: string; lesson_id: string; source: string; campaign: string; device: 'mobile' \| 'tablet' \| 'desktop' (typeof — string) |
| lesson_opened | [src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:257](/home/painsearchdev/agent-hq/workspaces/vera/969/src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:257): event={EVENTS.lessonOpened}; props на строке 258. Фактический track(event, props) — [src/components/track-on-mount.tsx:11](/home/painsearchdev/agent-hq/workspaces/vera/969/src/components/track-on-mount.tsx:11) | courseId: string; lessonId: string; locked: boolean |

Общие транспортные вызовы: [track-client.ts:8](/home/painsearchdev/agent-hq/workspaces/vera/969/src/lib/analytics/track-client.ts:8) → posthog.capture(event, props); [posthog.ts:47](/home/painsearchdev/agent-hq/workspaces/vera/969/src/lib/analytics/posthog.ts:47) → SDK capture. Они не являются дополнительными независимыми источниками lesson_view / lesson_opened.

Реестр имён: [events.ts:4](/home/painsearchdev/agent-hq/workspaces/vera/969/src/lib/analytics/events.ts:4) и строка 9. Это объявления имён, а не отправка. Комментарий lesson_view неполон: в реальном payload дополнительно есть courseId и lessonDocumentId.

Типы и происхождение lesson_view:
- Компонент объявляет courseId, lessonDocumentId, lessonId, source, campaign как string: free-lesson-analytics.tsx:14–18. Он принимает произвольный lessonId:string; числовой смысл обеспечивается вызывающей страницей и конфигурацией, а не самим компонентом.
- device вычисляется по window.innerWidth: <640 — mobile; 640–1023 — tablet; >=1024 — desktop: строка 22.
- Единственное production-подключение — [page.tsx:242](/home/painsearchdev/agent-hq/workspaces/vera/969/src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:242). courseId — course.id, lessonDocumentId — lesson.id, lesson_id — freeLesson.lessonId.
- source: первый элемент source, иначе первый utm_source, иначе 'direct': page.tsx:247–249. campaign аналогично campaign / utm_campaign / 'gelato_dev': строки 250–252. Используется ??, поэтому пустая строка не заменяется fallback-значением.

Типы и происхождение lesson_opened:
- courseId = course.id, lessonId = lesson.id: page.tsx:189–190; оба поля объявлены string в [types.ts:14](/home/painsearchdev/agent-hq/workspaces/vera/969/src/lib/types.ts:14), строках 40–41.
- lessonId — ID документа Firestore, а не порядковый номер и не сегмент URL.
- locked — результат isLocked(...): page.tsx:207. Событие отправляется и для заблокированного превью (locked:true), и для доступного урока (locked:false).

SDK также присоединяет заданные приложением super properties: first_touch_utm_source:string, first_touch_referrer:string, first_touch_referring_domain:string, first_touch_pathname:string — [posthog-client.tsx:21](/home/painsearchdev/agent-hq/workspaces/vera/969/src/lib/analytics/posthog-client.tsx:21), регистрация в posthog.ts:32. Они описывают первый визит пользователя и не дают текущий номер урока. Перечень в таблице — явные payload-поля отправителей; стандартный контекст SDK рассмотрен отдельно ниже.

2. Где есть номер урока

| Курс и уроки | Событие при открытии | Номер среди явных свойств |
|---|---|---|
| claude-code, уроки 1, 2, 3, 4, 5, если lesson.access === 'free' | lesson_view | Да: lesson_id='01', '02', '03', '04', '05'; строка, не number |
| claude-code, урок 6 и последующие; также любой урок, не попавший в freeLesson-ветку | lesson_opened | Нет |
| claude-code-agents, включая бесплатное вступление №1 и остальные уроки | lesson_opened | Нет |
| Остальные курсы, включая vibecoding / it-vibecoding, ai-cartoons и будущие курсы на этом маршруте | lesson_opened | Нет |

Основания: [free-lessons.ts:11](/home/painsearchdev/agent-hq/workspaces/vera/969/src/lib/free-lessons.ts:11) объявляет литеральный тип '01' | '02' | '03' | '04' | '05'; COURSE_SLUG='claude-code' на строке 50. Соответствия №1→'01' и №2→'02': строки 53–54 и 72–73; №3→'03', №4→'04', №5→'05': строки 92–93, 112–113, 132–133. [getFreeLessonContent:155](/home/painsearchdev/agent-hq/workspaces/vera/969/src/lib/free-lessons.ts:155) возвращает контент только для этого курса; проверка бесплатного доступа перед вызовом — page.tsx:202.

Бесплатное вступление claude-code-agents №1 имеет отдельный SEO-контент (free-lessons.ts:27–29, 159–163), но не FreeLessonContent: поэтому оно идёт через lesson_opened. Наличие бесплатного доступа само по себе не включает lesson_view.

Универсальный номер уже доступен на сервере: [ResolvedLesson.number:49](/home/painsearchdev/agent-hq/workspaces/vera/969/src/lib/db/courses.ts:49), тип number. resolveLesson вычисляет index+1 после сортировки полного списка по order: строки 65–79. Нумерация выполняется до отсева неопубликованных уроков: строки 9–10, 25–26. Это порядковый номер в полном курсе, а не значение lesson.order. На странице он деструктурируется как number: page.tsx:184, но не передаётся в payload lesson_opened:258. Маршрутный параметр lessonNumber имеет тип string и может первоначально быть старым ID документа; надёжный источник номера — подтверждённый data.number.

Таблица описывает охват кода, а не выгрузку текущего production-каталога. К production-БД не обращались. Самостоятельные текстовые материалы вне маршрута нумерованных уроков не получают эти события через данный отправитель.

3. Какие существующие тесты что закрепляют

| Файл:строка | Закреплённое поведение |
|---|---|
| [tests/analytics-contract.ts:5](/home/painsearchdev/agent-hq/workspaces/vera/969/tests/analytics-contract.ts:5), validator:50 | Независимый контракт lesson_view: ровно шесть обязательных полей courseId, lessonDocumentId, lesson_id, source, campaign, device; optional=[]; все значения typeof string. Дополнительное явное поле также нарушает этот контракт. |
| [tests/analytics-contract.test.tsx:85](/home/painsearchdev/agent-hq/workspaces/vera/969/tests/analytics-contract.test.tsx:85) | Четыре проверки границ ширины 639/640/1023/1024. После ручного запуска реального эффекта FreeLessonAnalytics ровно один SDK capture('lesson_view', точный payload). lesson_id остаётся строкой '01'; проверяются поля курса и документа, source, campaign, device. |
| [tests/analytics-first-touch.test.ts:154](/home/painsearchdev/agent-hq/workspaces/vera/969/tests/analytics-first-touch.test.ts:154) | Полный JSON payload lesson_view и двух lesson_next_click должен побайтно совпадать с OLD_PAYLOADS:131–145. Fixture lesson_id='vibecoding-1' — произвольный вход компонента, а не доказательство production-вызова lesson_view на vibecoding. |
| [tests/analytics-first-touch.test.ts:163](/home/painsearchdev/agent-hq/workspaces/vera/969/tests/analytics-first-touch.test.ts:163) | Четыре first_touch_* super properties SDK присоединяются к трём уроковым событиям, при сохранении прежнего явного payload. Все first-touch значения — строки; они описывают первый визит, а не текущий номер урока. |
| [tests/free-lessons.test.ts:7](/home/painsearchdev/agent-hq/workspaces/vera/969/tests/free-lessons.test.ts:7) | Косвенно закрепляет источник номера: только claude-code №1–5 имеют lessonId='01'…'05'; claude-code №6 и ai-cartoons №1 возвращают null. Отправку SDK не проверяет. |
| [tests/analytics-contract.test.tsx:104](/home/painsearchdev/agent-hq/workspaces/vera/969/tests/analytics-contract.test.tsx:104) | Смежная проверка: клик на программу claude-code-agents (target:'course', без to_lesson) отличается от клика 1→2 у vibecoding / claude-code-agents (target:'next_lesson', to_lesson:2). До клика capture отсутствует. lesson и to_lesson — number. Это не проверка открытия целевой страницы. |
| [tests/lesson-next-link.test.tsx:76](/home/painsearchdev/agent-hq/workspaces/vera/969/tests/lesson-next-link.test.tsx:76), :93, :102 | Кнопка 1→2 есть у нескольких курсов и произвольного future-course; последний урок не имеет следующей кнопки; скрытые промежутки пропускаются без перенумерации и перехода в чужой курс. Только клик отправляет lesson_next_click с числовыми lesson и to_lesson. |
| [tests/deferred-posthog.test.ts:76](/home/painsearchdev/agent-hq/workspaces/vera/969/tests/deferred-posthog.test.ts:76), :110 | Общий транспорт сохраняет payload и порядок ранних событий до загрузки SDK, регистрирует first-touch до replay, начинает загрузку после paint. Используется lesson_next_click; свойства lesson_opened и lesson_view напрямую этим тестом не закреплены. |

Для lesson_opened в tests/ нет ни записи в ANALYTICS_CONTRACT, ни теста payload / SDK capture. Также не найден сквозной тест навигации, который доказывал бы: успешное открытие №1 и затем №2 любого курса даёт события открытия с тем же courseId, правильными номерами и без дубля. Контрактный renderer вручную вызывает useEffect и click handlers; маршрутизатор и подтверждение получения событий PostHog он не запускает. Тест с #894 в имени (tests/reel-local-like-page-894.test.tsx) касается лайков Reels и эти уроковые события не проверяет.

Проверка выполнена: Vitest 4.1.8, 5 файлов, 42 теста — PASS, exit code 0, длительность 5.78 s. Запущены analytics-contract.test.tsx, analytics-first-touch.test.ts, free-lessons.test.ts, lesson-next-link.test.tsx, deferred-posthog.test.ts. Использован startVitest('test', filters, {config:false, watch:false, cache:false, reporters:['verbose']}, {envFile:false, resolve:{alias:{'@': absoluteSrc}}}); alias совпадает с vitest.config.ts, выбраны только перечисленные unit-тесты. Конфигурация собрана в памяти, чтение .env и запись кэша отключены. PostHog и обращения к БД в выбранных тестах замоканы. Новые тесты и файлы проекта не создавались.

4. Можно ли посчитать переход 1→2 по двум событиям

Для бесплатной цепочки claude-code — да: один и тот же пользователь PostHog, одинаковый courseId, сначала lesson_view с lesson_id='01', затем lesson_view с lesson_id='02' и более поздним timestamp в выбранном окне воронки. lessonDocumentId дополнительно идентифицирует документ. Речь об открытии страниц, а не о просмотре видео до конца или завершении урока.

Для произвольного курса по явному контракту — нет: оба открытия обычных уроков имеют lesson_opened и только courseId, lessonId, locked. Нельзя выделить первый и второй урок по самим значениям свойств без внешней таблицы соответствия (courseId, lessonId) → порядковый номер. lesson_view не покрывает такие уроки, поэтому объединение двух названий событий не создаёт недостающего измерения.

Установка PostHog имеет существенную оговорку: SDK добавляет строковые $current_url и $pathname к обычным browser-событиям: [event-utils.js:305](/home/painsearchdev/agent-hq/workspaces/vera/969/node_modules/posthog-js/lib/src/utils/event-utils.js:305), [posthog-core.js:994](/home/painsearchdev/agent-hq/workspaces/vera/969/node_modules/posthog-js/lib/src/posthog-core.js:994), :1167. При корректном URL и уже готовом SDK можно извлекать /courses/<slug>/lessons/1 либо /2, то есть часть данных может позволять анализ без отдельного lessonNumber. Нельзя утверждать, что в сохранённых PostHog-событиях номера вообще нигде нет; production-события в этой разведке не запрашивались.

Однако URL не заменяет надёжное свойство номера именно открытого урока: [posthog.ts:15](/home/painsearchdev/agent-hq/workspaces/vera/969/src/lib/analytics/posthog.ts:15) и :47–48 сохраняют ранний capture в очереди до инициализации SDK; replay на строке 34 выполняет SDK capture позднее. SDK читает location при этом позднем capture. Если за время загрузки человек перешёл с №1 на №2, событие №1 может получить URL №2.

Это проверено локальным экспериментом без файлов и сети: выполнен текущий wrapper posthog.ts после transpile в памяти, capture замокан с реальным getEventProperties установленного SDK. В очередь добавлен lesson_opened для doc-1 на странице /lessons/1, location изменён на /lessons/2, добавлен lesson_opened для doc-2, затем произведён init/replay. Результат:
[{"event":"lesson_opened","lessonId":"doc-1","pathname":"/courses/vibecoding/lessons/2"},{"event":"lesson_opened","lessonId":"doc-2","pathname":"/courses/vibecoding/lessons/2"}]
Assertion прошёл, exit code 0. Это доказательство поведения локального кода с mock-транспортом, а не измерение частоты проблемы в production.

Конкретно недостаёт: новое lessonNumber:number в явном payload lesson_opened, из уже подтверждённого data.number на странице, рядом с прежними courseId:string, lessonId:string, locked:boolean. Для lesson_view существующий lesson_id:string следует сохранить, поскольку он уже задаёт номер этой цепочки и жёстко закреплён тестами. Единое измерение при объединении можно нормализовать: для lesson_view Number(lesson_id), для lesson_opened lessonNumber — после появления последнего.

Минимальная потенциальная точка правки — page.tsx:258. В этой разведке правка не выполнена. Нужна будущая независимая проверка, которая падает при отсутствии lessonNumber и проходит при правильном числовом значении у реального lesson_opened; старые проверки lesson_view ослаблять не требуется.

Единственность источника уже обеспечивается взаимоисключающей веткой freeLesson ? FreeLessonAnalytics : TrackOnMount на page.tsx:241–260; key содержит courseId и lessonId и меняется при навигации между уроками. У эффекта нет глобальной дедупликации повторного монтажа. Сервер сначала подтверждает resolveLesson и обрабатывает notFound / canonical redirect: page.tsx:175–187; событие вызывается при клиентском монтировании выданной страницы. Это не подтверждение записи просмотра в БД: RecordView на page.tsx:268 запускает независимый action и не ожидается этими событиями. Подтверждение приёма события сервером PostHog также не ожидается.

lesson_next_click уже описывает курс и оба числовых номера, но клик может закончиться неуспешной навигацией и не подтверждает открытие второго урока. Для воронки открытий нужен последующий event открытия. locked:true сохраняет прежнюю семантику открытия превью; если считать только доступные уроки, необходим фильтр locked:false, а не изменение значения старого поля.

retention_w1, скрипты метрик, платежи, авторизация, Firestore rules, сертификаты и запрещённые пути не менялись. Деплой не выполнялся, проверка на production не заявляется.

REPORT_BYTES=23582

POSSIBLE=no
MISSING=lessonNumber:number в явном payload lesson_opened, из подтверждённого data.number; для анализа прежних событий без него нужна проверенная внешняя привязка lessonId к номеру
FILES=[]
DIFF_BYTES=0
GIT_STATUS=
?? report.md
