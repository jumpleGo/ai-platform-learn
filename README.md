# Видео-платформа уроков

Платформа видео-уроков по подписке: каталог курсов с YouTube/Vimeo-эмбедами,
бесплатные и платные уроки (пейволл), личный прогресс, админка для управления
контентом и подписками, партнёрские ссылки с брендингом и продуктовая
аналитика воронок.

## Стек

- **Next.js 16** (App Router, React Server Components, Turbopack), React 19, TypeScript
- **Tailwind CSS 4** + shadcn/ui (Base UI)
- **Firebase**: Auth (Email + Google) и Firestore; на сервере — firebase-admin,
  локально — эмуляторы
- **PostHog** — продуктовая аналитика (клиент + сервер)
- **Vitest** — юнит-тесты

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | Дев-сервер на http://localhost:3000 |
| `npm run build` | Продакшен-сборка |
| `npm test` | Юнит-тесты (Vitest, `tests/`) |
| `npm run emulators` | Firebase-эмуляторы (Auth :9099, Firestore :8080, UI :4000) |
| `npx tsx scripts/seed.ts` | Сид тестовых курсов и уроков в Firestore |
| `npx tsx scripts/make-admin.ts user@example.com` | Назначить пользователя админом |

Локальная разработка: скопировать `.env.example` в `.env.local`, поставить
`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1`, запустить `npm run emulators`, затем
сид и `npm run dev`.

## Переменные окружения

См. `.env.example`:

| Переменная | Описание |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Web API Key проекта Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain (`<project>.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID проекта Firebase |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | base64 от JSON сервисного аккаунта (для firebase-admin) |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` | `1` — работать с локальными эмуляторами |
| `NEXT_PUBLIC_POSTHOG_KEY` | Project API Key PostHog (`phc_...`); пусто — аналитика выключена |
| `NEXT_PUBLIC_POSTHOG_HOST` | Хост PostHog, по умолчанию `https://eu.i.posthog.com` |
| `PAYMENT_WEBHOOK_SECRET` | Секрет подписи вебхука платёжки (`/api/webhooks/payment`) |

## Подключение реального Firebase

1. Создать проект в [Firebase Console](https://console.firebase.google.com).
2. В **Authentication → Sign-in method** включить **Email/Password** и **Google**.
3. Создать базу **Firestore** (production mode).
4. Задеплоить правила безопасности: `firebase deploy --only firestore:rules`
   (файл `firestore.rules`).
5. В **Project settings → Service accounts** сгенерировать ключ сервисного
   аккаунта, закодировать и положить в env:

   ```bash
   base64 -i service-account.json   # результат → FIREBASE_SERVICE_ACCOUNT_BASE64
   ```

6. Заполнить `NEXT_PUBLIC_FIREBASE_*` из настроек веб-приложения проекта.
7. Выключить эмуляторы: `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=` (пусто или удалить).

## Назначение админа

После регистрации пользователя выполнить:

```bash
npx tsx scripts/make-admin.ts user@example.com
```

Скрипт ставит custom claim `role: admin` и обновляет профиль в Firestore.
Роль попадёт в session cookie после повторного входа — затем открывается
доступ к `/admin` (курсы, уроки, пользователи, подписки, партнёры).

## Документация

- [docs/analytics-funnels.md](docs/analytics-funnels.md) — события аналитики и
  настройка трёх воронок в PostHog (регистрация, вовлечение, монетизация).
- [docs/superpowers/plans/](docs/superpowers/plans/) — план реализации проекта.
