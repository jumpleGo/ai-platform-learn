# Аналитика: события и воронки PostHog

Документ описывает события продуктовой аналитики и три воронки, которые нужно
настроить в PostHog (**Insights → Funnels**). Имена событий зафиксированы в
`src/lib/analytics/events.ts` — не переименовывать без миграции сохранённых
инсайтов в PostHog.

## События

Основные события платформы из `src/lib/analytics/events.ts`:

| Событие | Props | Откуда отправляется |
|---|---|---|
| `signup_completed` | `partnerId`, `utm_source` | Сервер (posthog-node): `src/app/(auth)/actions.ts` → `ensureUserProfile()` — один раз при создании профиля пользователя после регистрации (email или Google). Атрибуция берётся из cookies `partner`/`utm`. |
| `lesson_opened` | `courseId`, `lessonId`, `locked` | Клиент (posthog-js): `<TrackOnMount>` на странице урока `src/app/(app)/courses/[courseId]/lessons/[lessonId]/page.tsx` — при каждом открытии урока, включая залоченные (`locked: true`). |
| `lesson_completed` | `courseId`, `lessonId` | Клиент: `src/components/complete-lesson-button.tsx` — после успешного server action `completeLesson` (кнопка «Урок пройден»). |
| `paywall_viewed` | `courseId`, `lessonId` | Клиент: второй `<TrackOnMount>` на той же странице урока — рендерится только когда урок залочен (показан пейволл). |
| `subscribe_clicked` | `place` | Клиент: `src/components/subscribe-button.tsx` — клик по «Оформить подписку». Кнопка используется в `src/components/paywall-banner.tsx` с `place="paywall"`. |
| `subscription_activated` | `plan`, `source` | Сервер: два места — `src/app/admin/users/actions.ts` → `grantSubscriptionAction` (`source: 'manual'`, выдача админом) и `src/app/api/webhooks/payment/route.ts` (`source: 'payment'`, вебхук платёжки). |

События воронки открытых уроков `/courses/claude-code/lessons/1–4`:

| Событие | Props | Когда отправляется |
|---|---|---|
| `lesson_view` | `lesson_id`, `source`, `campaign`, `device`, `courseId`, `lessonDocumentId` | Один раз при открытии страницы бесплатного урока. Заменяет `lesson_opened` только на этих четырёх страницах, поэтому дубля нет. |
| `video_start` | `lesson_id` | При первом фактическом запуске видео. |
| `video_25`, `video_50`, `video_75`, `video_90` | `lesson_id`, `progress` | При первом достижении каждой отметки за открытие страницы. |
| `video_complete` | `lesson_id`, `progress: 100` | При первом завершении видео. |
| `lesson_cta_click` | `lesson_id`, `cta_position`, `destination` | Клик по основному CTA; `cta_position` равен `primary` или `bottom`. |
| `telegram_click` | `lesson_id`, `cta_position` | Клик по вторичной ссылке на Telegram. |

Рекомендуемая воронка бесплатного урока: `lesson_view` → `video_start` →
`video_90` → `lesson_cta_click`. Разбивка — по `lesson_id`, `source`, `campaign`
и `device`. Переход на `vibe.gelato.education` получает эти значения в query,
включая фиксированные `source=free_lesson` и `lesson_id`.

Дополнительно posthog-js автоматически шлёт `$pageview` (включено через
`defaults: '2025-05-24'` в `src/lib/analytics/posthog-client.tsx`), в том числе
при SPA-навигации. Путь страницы лежит в свойстве `$pathname`.

Серверные события отправляются с `distinctId = Firebase uid`; на клиенте после
логина вызывается `identify(uid)` (`src/app/(auth)/session-client.ts`), поэтому
клиентские и серверные события одного пользователя склеиваются в один профиль.

## Воронка 1: Регистрация

Эффективность лендингов и B2B-партнёров: сколько посетителей страниц входа
доходят до созданного аккаунта.

- **Шаг 1:** `$pageview` с фильтром по свойству `$pathname` = `/login` **или** `/register`
  (в PostHog: фильтр шага → Pathname → matches regex `^/(login|register)$`,
  либо два значения через «is one of»).
- **Шаг 2:** `signup_completed`.
- **Breakdown:** `utm_source` — сравнение лендингов/каналов; `partnerId` —
  конверсия по B2B-партнёрам (для органики `partnerId = null`).
- Conversion window можно оставить дефолтный (14 дней) — регистрация обычно
  происходит в той же сессии.

## Воронка 2: Вовлечение

Доходят ли новые пользователи до контента и завершают ли уроки.

- **Шаг 1:** `signup_completed`
- **Шаг 2:** `lesson_opened`
- **Шаг 3:** `lesson_completed`
- **Conversion window:** 7 дней.
- **Breakdown:** `courseId` — какие курсы лучше удерживают новичков
  (свойство есть на шагах 2–3; в настройках breakdown указать event property
  `courseId`).

## Воронка 3: Монетизация

Путь от показа пейволла до активной подписки.

- **Шаг 1:** `paywall_viewed`
- **Шаг 2:** `subscribe_clicked`
- **Шаг 3:** `subscription_activated`
- **Conversion window:** 30 дней.
- **Breakdown:** `plan` (свойство последнего шага) — какие тарифы покупают.
  Дополнительно полезен разрез по `source` (`payment` vs `manual`), чтобы
  исключить ручные выдачи из оценки конверсии: фильтр шага 3
  `source = payment`.

## Как подключить PostHog

1. Создать проект на [https://eu.posthog.com](https://eu.posthog.com)
   (EU-инстанс — данные хранятся в ЕС, host `https://eu.i.posthog.com`).
2. Взять **Project API Key** (Settings → Project → Project API Key, начинается
   с `phc_`).
3. Заполнить переменные в `.env.local` (локально) и в env прода:

   ```
   NEXT_PUBLIC_POSTHOG_KEY=phc_...
   NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
   ```

   Без ключа аналитика выключена (no-op) — приложение работает как обычно.
4. События появятся в **Activity → Live Events** автоматически после первого
   захода на сайт — отдельной настройки схемы не нужно.
5. Пользователи идентифицируются по **Firebase uid**: клиент вызывает
   `posthog.identify(uid)` после логина, серверные события используют тот же
   uid как `distinctId`. В PostHog один человек = один uid.
6. После того как события начали поступать, собрать три воронки выше в
   **Insights → Funnels** и сохранить их на дашборд.
