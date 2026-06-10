# Видео-платформа уроков: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Видео-платформа с курсами в виде каруселей уроков, админкой, подписками с «замочками» (без жёсткой блокировки), B2B-атрибуцией партнёров и воронками в аналитике.

**Architecture:** Один Next.js-проект (App Router, RSC): публичная часть `/`, защищённая авторизацией, и админка `/admin` по роли. Firebase — Auth + Firestore + Storage; видео хранится на внешнем видеохостинге (урок хранит embed-URL). Аналитика и воронки — PostHog. Каталог курсов кэшируется (ISR + revalidateTag), поэтому сайт быстрый: данные курсов рендерятся на сервере из кэша, клиентский JS минимален.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Firebase (Auth, Firestore, Storage) + firebase-admin · PostHog (`posthog-js`, `posthog-node`) · Vitest · деплой Vercel.

---

## Ключевые решения

| Вопрос | Решение | Почему |
|---|---|---|
| База / Auth | Firebase (Firestore + Auth) | Просили Firebase; нулевой бэкенд-оверхед, эмулятор для тестов |
| Видео | Внешний видеохостинг, урок хранит `videoEmbedUrl` (iframe). **YouTube поддерживается из коробки**: админ вставляет любую ссылку (watch / youtu.be / shorts / embed), она нормализуется в embed-URL | Firebase Storage не годится для стриминга. Kinescope (РФ) или Mux — выбор провайдера не блокирует разработку: в MVP админ вставляет ссылку на плеер. Прямая загрузка через API провайдера — отдельный план после выбора |
| Доступы | «Замочки» чисто визуальные: бейдж + paywall-баннер на уроке. Роуты и плеер НЕ блокируются | Явное требование пользователя |
| Аналитика и воронки | PostHog | Воронки из коробки, бесплатный тариф, простая интеграция |
| Платежи | В этом плане: ручная выдача подписок в админке + generic webhook-endpoint. Интеграция конкретного провайдера (ЮKassa / CloudPayments / Stripe) — отдельный план | Провайдер не выбран; модель подписок от него не зависит |
| B2B | Партнёрские ссылки `/r/{slug}` → cookie → атрибуция при регистрации → брендинг-бар «Вы пришли от …» | Лендингов бесконечно много — атрибуция через ref/utm параметры, а не через код на лендингах |
| Сессии | Firebase session cookie (`createSessionCookie` / `verifySessionCookie`) | Серверная проверка в RSC без клиентских ожиданий, стандартный паттерн |

## Модель данных (Firestore)

```
users/{uid}                    email, displayName, role: 'user'|'admin',
                               partnerId: string|null, utm: map|null, createdAt
partners/{partnerId}           name, slug, logoUrl, brandColor, active
courses/{courseId}             title, description, coverUrl, order, published, access: 'free'|'paid'
courses/{courseId}/lessons/{lessonId}
                               title, description, videoEmbedUrl, durationSec|null,
                               order, access: 'free'|'paid'
subscriptions/{uid}            status: 'active'|'expired', plan, source: 'manual'|'payment'|'b2b',
                               startsAt, expiresAt|null, grantedBy|null
users/{uid}/progress/{lessonId}  completed: boolean, updatedAt
```

Роль admin дублируется в custom claims токена (`role: 'admin'`) — для быстрой проверки в middleware и security rules.

## Структура файлов

```
src/
  app/
    (auth)/login/page.tsx              # страница входа
    (auth)/register/page.tsx           # страница регистрации
    (app)/layout.tsx                   # шапка, брендинг-бар партнёра, проверка сессии
    (app)/page.tsx                     # главная: карусели курсов
    (app)/courses/[courseId]/lessons/[lessonId]/page.tsx
    admin/layout.tsx                   # проверка роли admin
    admin/page.tsx                     # дашборд
    admin/courses/page.tsx             # список курсов
    admin/courses/[courseId]/page.tsx  # редактор курса + уроки
    admin/users/page.tsx               # пользователи + выдача подписок
    admin/partners/page.tsx            # CRUD партнёров
    api/auth/session/route.ts          # обмен ID token -> session cookie
    api/webhooks/payment/route.ts      # generic endpoint для платёжки
    r/[slug]/route.ts                  # партнёрская ссылка -> cookie -> redirect
  lib/
    types.ts                           # все доменные типы
    firebase/client.ts                 # клиентский SDK (auth)
    firebase/admin.ts                  # firebase-admin (singleton)
    db/courses.ts, partners.ts, subscriptions.ts, users.ts, progress.ts
    access.ts                          # логика замочков (чистая функция)
    attribution.ts                     # парсинг ref/utm из cookies (чистая функция)
    analytics/events.ts               # типизированные имена событий
    analytics/posthog-client.tsx      # провайдер posthog-js
    analytics/posthog-server.ts       # posthog-node singleton
  components/
    course-carousel.tsx, lesson-card.tsx, lock-badge.tsx,
    paywall-banner.tsx, partner-bar.tsx, video-embed.tsx
  middleware.ts                        # захват utm в cookie, редирект на /login
firestore.rules
tests/  (vitest: access.test.ts, attribution.test.ts)
docs/analytics-funnels.md
```

---

## Фаза 0: Скаффолд проекта

### Task 0.1: Next.js + Tailwind + shadcn/ui + Vitest

**Files:**
- Перезаписываются: `package.json`, `tsconfig.json`; удаляется `src/index.ts`

- [ ] **Step 1: Снести заглушку и создать Next.js-проект**

```bash
rm -rf src tsconfig.json package.json
npx create-next-app@latest . --ts --tailwind --app --src-dir --import-alias "@/*" --no-eslint --yes
```

- [ ] **Step 2: Подключить shadcn/ui и базовые компоненты**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button card input label dialog table badge sonner
```

- [ ] **Step 3: Поставить Vitest**

```bash
npm i -D vitest
```

В `package.json` в `scripts` добавить: `"test": "vitest run"`.

- [ ] **Step 4: Проверить запуск**

Run: `npm run dev` — открывается стартовая страница Next.js без ошибок.

- [ ] **Step 5: Commit** — `chore: scaffold next.js app`

### Task 0.2: Доменные типы

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Написать типы**

```ts
export type Role = 'user' | 'admin';
export type Access = 'free' | 'paid';

export interface UserDoc {
  email: string;
  displayName: string;
  role: Role;
  partnerId: string | null;
  utm: Record<string, string> | null;
  createdAt: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  coverUrl: string | null;
  order: number;
  published: boolean;
  access: Access;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  videoEmbedUrl: string;
  durationSec: number | null;
  order: number;
  access: Access;
}

export interface Partner {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
  active: boolean;
}

export interface Subscription {
  status: 'active' | 'expired';
  plan: string;
  source: 'manual' | 'payment' | 'b2b';
  startsAt: number;
  expiresAt: number | null;
  grantedBy: string | null;
}
```

- [ ] **Step 2: Commit** — `feat: domain types`

---

## Фаза 1: Firebase и авторизация (вход/регистрация обязательны)

### Task 1.1: Firebase-проект и SDK

**Files:**
- Create: `src/lib/firebase/client.ts`, `src/lib/firebase/admin.ts`, `.env.local`, `.env.example`

- [ ] **Step 1: Создать Firebase-проект** (консоль): включить Authentication (Email/Password + Google), Firestore, Storage. Скачать service account JSON. **Для локальной разработки без реального проекта** — Firebase Emulator Suite: `firebase.json` с эмуляторами auth (9099) и firestore (8080); клиент подключается через `connectAuthEmulator`, admin SDK — через env `FIREBASE_AUTH_EMULATOR_HOST` / `FIRESTORE_EMULATOR_HOST` (в этом режиме service account не нужен, `initializeApp({ projectId: 'demo-platform' })`). Переключение по env `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1`.

- [ ] **Step 2: Установить SDK**

```bash
npm i firebase firebase-admin
```

- [ ] **Step 3: `.env.example` (и заполненный `.env.local`)**

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_BASE64=   # base64 от service-account.json
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
PAYMENT_WEBHOOK_SECRET=
```

- [ ] **Step 4: Клиентский SDK**

```ts
// src/lib/firebase/client.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const app = getApps()[0] ?? initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

export const clientAuth = getAuth(app);
```

- [ ] **Step 5: Admin SDK (singleton)**

```ts
// src/lib/firebase/admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const app = getApps()[0] ?? initializeApp({
  credential: cert(JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!, 'base64').toString()
  )),
});

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
```

- [ ] **Step 6: Commit** — `feat: firebase sdk setup`

### Task 1.2: Session cookie и middleware

**Files:**
- Create: `src/app/api/auth/session/route.ts`, `src/lib/session.ts`, `src/middleware.ts`

- [ ] **Step 1: Обмен ID token → session cookie**

```ts
// src/app/api/auth/session/route.ts
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const { idToken } = await req.json();
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: WEEK_MS });
  (await cookies()).set('session', sessionCookie, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: WEEK_MS / 1000, path: '/',
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete('session');
  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Хелпер чтения сессии для RSC**

```ts
// src/lib/session.ts
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

export async function getSession() {
  const cookie = (await cookies()).get('session')?.value;
  if (!cookie) return null;
  try {
    return await adminAuth.verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Middleware — редирект неавторизованных на /login + захват utm/ref в cookie**

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC = ['/login', '/register', '/r/', '/api/'];

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const res = PUBLIC.some((p) => pathname.startsWith(p)) || req.cookies.has('session')
    ? NextResponse.next()
    : NextResponse.redirect(new URL('/login', req.url));

  // сохраняем utm-метки с любого лендинга до момента регистрации
  const utm: Record<string, string> = {};
  for (const [k, v] of searchParams) if (k.startsWith('utm_')) utm[k] = v;
  if (Object.keys(utm).length) {
    res.cookies.set('utm', JSON.stringify(utm), { maxAge: 60 * 60 * 24 * 30, path: '/' });
  }
  const ref = searchParams.get('ref');
  if (ref) res.cookies.set('partner', ref, { maxAge: 60 * 60 * 24 * 30, path: '/' });
  return res;
}

export const config = { matcher: ['/((?!_next|favicon.ico|.*\\.(?:png|jpg|svg|webp)).*)'] };
```

Замечание: middleware не проверяет валидность cookie (это делает `getSession()` в layout) — он только убирает очевидно неавторизованные переходы, чтобы не дёргать admin SDK на каждый запрос.

- [ ] **Step 4: Commit** — `feat: session cookie auth + utm capture middleware`

### Task 1.3: Страницы /login и /register

**Files:**
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/(auth)/layout.tsx`, `src/lib/db/users.ts`, `src/app/(auth)/actions.ts`

- [ ] **Step 1: Серверный action создания профиля с атрибуцией**

```ts
// src/app/(auth)/actions.ts
'use server';
import { cookies } from 'next/headers';
import { adminDb } from '@/lib/firebase/admin';
import { resolveAttribution } from '@/lib/attribution';

export async function createUserProfile(uid: string, email: string, displayName: string) {
  const jar = await cookies();
  const { partnerId, utm } = resolveAttribution({
    partner: jar.get('partner')?.value ?? null,
    utm: jar.get('utm')?.value ?? null,
  });
  await adminDb.doc(`users/${uid}`).set({
    email, displayName, role: 'user', partnerId, utm, createdAt: Date.now(),
  });
}
```

- [ ] **Step 2: Чистая функция атрибуции + тест (TDD)**

```ts
// tests/attribution.test.ts
import { describe, it, expect } from 'vitest';
import { resolveAttribution } from '@/lib/attribution';

describe('resolveAttribution', () => {
  it('возвращает partnerId и utm из cookies', () => {
    expect(resolveAttribution({ partner: 'acme', utm: '{"utm_source":"vk"}' }))
      .toEqual({ partnerId: 'acme', utm: { utm_source: 'vk' } });
  });
  it('null при отсутствии cookies', () => {
    expect(resolveAttribution({ partner: null, utm: null }))
      .toEqual({ partnerId: null, utm: null });
  });
  it('не падает на битом JSON в utm', () => {
    expect(resolveAttribution({ partner: null, utm: '{oops' }))
      .toEqual({ partnerId: null, utm: null });
  });
});
```

Run: `npm test` → FAIL (модуля нет). Затем реализация:

```ts
// src/lib/attribution.ts
export function resolveAttribution(input: { partner: string | null; utm: string | null }) {
  let utm: Record<string, string> | null = null;
  if (input.utm) {
    try { utm = JSON.parse(input.utm); } catch { utm = null; }
  }
  return { partnerId: input.partner, utm };
}
```

Run: `npm test` → PASS.

- [ ] **Step 3: Страницы login/register** — клиентские формы (email/пароль + кнопка Google) на shadcn `Card/Input/Button`. Логика: `signInWithEmailAndPassword` / `createUserWithEmailAndPassword(clientAuth, ...)` → `getIdToken()` → `POST /api/auth/session` → при регистрации дополнительно `createUserProfile(uid, email, name)` → `router.push('/')`. Ссылки между страницами «Войти / Зарегистрироваться».

- [ ] **Step 4: Проверка вручную** — регистрация нового пользователя проходит, в Firestore появляется `users/{uid}`, после входа открывается `/`, без cookie редиректит на `/login`.

- [ ] **Step 5: Commit** — `feat: login and register pages with attribution`

---

## Фаза 2: Каталог — карусели курсов и страница урока

### Task 2.1: Слой данных курсов + кэш

**Files:**
- Create: `src/lib/db/courses.ts`

- [ ] **Step 1: Чтение с кэшем (быстрый сайт — каталог из кэша, инвалидация по тегу из админки)**

```ts
// src/lib/db/courses.ts
import { unstable_cache, revalidateTag } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import type { Course, Lesson } from '@/lib/types';

export const getPublishedCoursesWithLessons = unstable_cache(
  async (): Promise<Array<Course & { lessons: Lesson[] }>> => {
    const snap = await adminDb.collection('courses')
      .where('published', '==', true).orderBy('order').get();
    return Promise.all(snap.docs.map(async (d) => {
      const lessons = await d.ref.collection('lessons').orderBy('order').get();
      return {
        id: d.id, ...(d.data() as Omit<Course, 'id'>),
        lessons: lessons.docs.map((l) => ({ id: l.id, courseId: d.id, ...(l.data() as Omit<Lesson, 'id' | 'courseId'>) })),
      };
    }));
  },
  ['catalog'],
  { tags: ['catalog'], revalidate: 300 },
);

export function invalidateCatalog() {
  revalidateTag('catalog');
}
```

- [ ] **Step 2: Сид-скрипт** `scripts/seed.ts` — создаёт 2 курса по 4 урока (один курс `free`, один `paid`, видео — любой публичный embed для проверки плеера). Запуск: `npx tsx scripts/seed.ts`.

- [ ] **Step 3: Commit** — `feat: courses data layer with cache + seed`

### Task 2.2: Главная с каруселями

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`, `src/components/course-carousel.tsx`, `src/components/lesson-card.tsx`, `src/components/lock-badge.tsx`

- [ ] **Step 1: Layout группы (app)** — серверный: `getSession()`, нет сессии → `redirect('/login')`; шапка с именем пользователя и кнопкой выхода (DELETE `/api/auth/session`).

- [ ] **Step 2: Карусель** — серверная страница получает `getPublishedCoursesWithLessons()` и подписку юзера; каждая карусель — горизонтальный скролл-ряд (`overflow-x-auto` + `snap-x`, CSS-скролл без JS-библиотек — быстрее и проще):

```tsx
// src/components/course-carousel.tsx
import { LessonCard } from './lesson-card';
import type { Course, Lesson } from '@/lib/types';

export function CourseCarousel({ course, lessons, locked }: {
  course: Course; lessons: Lesson[]; locked: (l: Lesson) => boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{course.title}</h2>
      <div className="flex gap-4 overflow-x-auto snap-x pb-2">
        {lessons.map((l) => (
          <LessonCard key={l.id} lesson={l} locked={locked(l)} />
        ))}
      </div>
    </section>
  );
}
```

`LessonCard` — ссылка на `/courses/{courseId}/lessons/{id}`, обложка через `next/image`, при `locked` — `<LockBadge />` (иконка замка поверх карточки). Переход НЕ блокируется.

- [ ] **Step 3: Логика замочков (TDD)** — тест `tests/access.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isLocked } from '@/lib/access';

const sub = (over = {}) => ({ status: 'active', plan: 'base', source: 'manual', startsAt: 0, expiresAt: null, grantedBy: null, ...over }) as const;

describe('isLocked', () => {
  it('free-урок открыт без подписки', () => {
    expect(isLocked({ access: 'free' }, { access: 'free' }, null, 1000)).toBe(false);
  });
  it('paid-урок закрыт без подписки', () => {
    expect(isLocked({ access: 'paid' }, { access: 'free' }, null, 1000)).toBe(true);
  });
  it('paid-курс закрывает даже free-урок', () => {
    expect(isLocked({ access: 'free' }, { access: 'paid' }, null, 1000)).toBe(true);
  });
  it('активная подписка открывает всё', () => {
    expect(isLocked({ access: 'paid' }, { access: 'paid' }, sub(), 1000)).toBe(false);
  });
  it('истёкшая подписка не открывает', () => {
    expect(isLocked({ access: 'paid' }, { access: 'free' }, sub({ expiresAt: 500 }), 1000)).toBe(true);
  });
});
```

Реализация после FAIL:

```ts
// src/lib/access.ts
import type { Access, Subscription } from '@/lib/types';

export function isLocked(
  lesson: { access: Access },
  course: { access: Access },
  sub: Subscription | null,
  now: number,
): boolean {
  const paid = lesson.access === 'paid' || course.access === 'paid';
  if (!paid) return false;
  const active = !!sub && sub.status === 'active' && (sub.expiresAt === null || sub.expiresAt > now);
  return !active;
}
```

Run: `npm test` → PASS.

- [ ] **Step 4: Проверка вручную** — главная показывает 2 карусели из сида, на платных уроках замочки, скролл работает.

- [ ] **Step 5: Commit** — `feat: home page with course carousels and lock badges`

### Task 2.3: Страница урока

**Files:**
- Create: `src/app/(app)/courses/[courseId]/lessons/[lessonId]/page.tsx`, `src/components/video-embed.tsx`, `src/components/paywall-banner.tsx`, `src/lib/db/progress.ts`, `src/lib/video-url.ts`, `tests/video-url.test.ts`

- [ ] **Step 0: Нормализация видео-ссылок (TDD)** — админ вставляет любую ссылку YouTube или embed-URL хостинга; тест `tests/video-url.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { toEmbedUrl } from '@/lib/video-url';

describe('toEmbedUrl', () => {
  it('youtube watch -> embed', () => {
    expect(toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
  it('youtu.be -> embed', () => {
    expect(toEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=10'))
      .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
  it('youtube shorts -> embed', () => {
    expect(toEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'))
      .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
  it('уже embed-ссылка YouTube остаётся как есть', () => {
    expect(toEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });
  it('прочие хостинги (Kinescope/Mux) — без изменений', () => {
    expect(toEmbedUrl('https://kinescope.io/embed/abc123'))
      .toBe('https://kinescope.io/embed/abc123');
  });
});
```

Реализация после FAIL — `src/lib/video-url.ts`: `toEmbedUrl(url: string): string` — вытаскивает video id из форм `watch?v=`, `youtu.be/`, `/shorts/` и собирает `https://www.youtube-nocookie.com/embed/{id}`; всё остальное возвращает без изменений. `VideoEmbed` использует `toEmbedUrl(lesson.videoEmbedUrl)`.

- [ ] **Step 1: Страница** — серверная: загружает урок + курс + подписку; рендерит `<VideoEmbed url={lesson.videoEmbedUrl} />` (адаптивный iframe 16:9 с `loading="lazy"`, `allowFullScreen`, `allow="autoplay; encrypted-media; picture-in-picture"`); если `isLocked(...)` — над плеером `<PaywallBanner />` («Урок доступен по подписке» + кнопка; просмотр при этом не блокируется — требование); снизу список остальных уроков курса для навигации.

- [ ] **Step 2: Прогресс** — кнопка «Урок пройден» (client component) вызывает server action `markCompleted(lessonId)` → `users/{uid}/progress/{lessonId} = { completed: true, updatedAt }`. На карточках пройденных уроков — галочка (прогресс читается в page.tsx вместе с каталогом).

- [ ] **Step 3: Проверка вручную** — видео проигрывается, на платном уроке виден paywall-баннер, но плеер работает; «Урок пройден» сохраняется и отображается после перезагрузки.

- [ ] **Step 4: Commit** — `feat: lesson page with video embed, paywall banner, progress`

### Task 2.4: Firestore security rules

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: Правила** (клиент почти не пишет напрямую — всё через server actions с admin SDK, поэтому правила консервативные):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth.uid == uid;
      allow write: if false; // только admin SDK
      match /progress/{lessonId} {
        allow read, write: if request.auth.uid == uid;
      }
    }
    match /courses/{courseId} {
      allow read: if request.auth != null && resource.data.published == true;
      allow write: if false;
      match /lessons/{lessonId} {
        allow read: if request.auth != null;
        allow write: if false;
      }
    }
    match /subscriptions/{uid} {
      allow read: if request.auth.uid == uid;
      allow write: if false;
    }
    match /partners/{id} {
      allow read: if true; // брендинг нужен до логина
      allow write: if false;
    }
  }
}
```

- [ ] **Step 2: Deploy** — `npx firebase-tools deploy --only firestore:rules`

- [ ] **Step 3: Commit** — `feat: firestore security rules`

---

## Фаза 3: Админка

### Task 3.1: Роль admin и layout админки

**Files:**
- Create: `src/app/admin/layout.tsx`, `scripts/make-admin.ts`

- [ ] **Step 1: Скрипт назначения админа**

```ts
// scripts/make-admin.ts — npx tsx scripts/make-admin.ts <email>
import { adminAuth, adminDb } from '../src/lib/firebase/admin';

const email = process.argv[2];
const user = await adminAuth.getUserByEmail(email);
await adminAuth.setCustomUserClaims(user.uid, { role: 'admin' });
await adminDb.doc(`users/${user.uid}`).update({ role: 'admin' });
console.log(`admin: ${email}`);
```

- [ ] **Step 2: Layout** — `getSession()`; если `session?.role !== 'admin'` → `redirect('/')`. Боковое меню: Курсы, Пользователи, Партнёры.

- [ ] **Step 3: Commit** — `feat: admin role and admin layout`

### Task 3.2: CRUD курсов и уроков

**Files:**
- Create: `src/app/admin/courses/page.tsx`, `src/app/admin/courses/[courseId]/page.tsx`, `src/app/admin/courses/actions.ts`

- [ ] **Step 1: Server actions** — `createCourse`, `updateCourse`, `deleteCourse`, `createLesson`, `updateLesson`, `deleteLesson`, `reorder(kind, ids[])` (перезаписывает поле `order` по индексу массива). Каждый action: проверка `role === 'admin'` через `getSession()`, запись через `adminDb`, в конце `invalidateCatalog()` — так публичный каталог обновляется мгновенно, оставаясь кэшированным.

- [ ] **Step 2: Список курсов** — таблица shadcn `Table`: название, статус published, access, число уроков; кнопки «Создать курс», порядок — кнопки вверх/вниз (вызывают `reorder`; drag-n-drop не тянем — YAGNI).

- [ ] **Step 3: Редактор курса** — форма полей курса (title, description, access, published, обложка) + список уроков с инлайн-формой урока: title, description, **videoEmbedUrl** (ссылка на плеер видеохостинга — Kinescope/Mux/др.), durationSec, access, порядок. Обложка: загрузка в Firebase Storage через server action (`getStorage().bucket().file(...).save(buffer)`), в курс пишется публичный URL.

- [ ] **Step 4: Проверка вручную** — создать курс с 2 уроками через админку, опубликовать → он появился на главной без редеплоя (revalidateTag сработал).

- [ ] **Step 5: Commit** — `feat: admin courses and lessons CRUD`

### Task 3.3: Пользователи и ручная выдача подписок

**Files:**
- Create: `src/app/admin/users/page.tsx`, `src/app/admin/users/actions.ts`, `src/lib/db/subscriptions.ts`

- [ ] **Step 1: Слой подписок**

```ts
// src/lib/db/subscriptions.ts
import { adminDb } from '@/lib/firebase/admin';
import type { Subscription } from '@/lib/types';

export async function getSubscription(uid: string): Promise<Subscription | null> {
  const snap = await adminDb.doc(`subscriptions/${uid}`).get();
  return snap.exists ? (snap.data() as Subscription) : null;
}

export async function grantSubscription(uid: string, sub: Subscription) {
  await adminDb.doc(`subscriptions/${uid}`).set(sub);
}
```

- [ ] **Step 2: Страница пользователей** — таблица: email, имя, дата регистрации, партнёр, статус подписки; поиск по email. Кнопка «Выдать подписку» → диалог: план, срок (30/90/365 дней/бессрочно) → action `grantSubscription(uid, { status: 'active', plan, source: 'manual', startsAt: Date.now(), expiresAt, grantedBy: adminUid })`.

- [ ] **Step 3: Проверка вручную** — выдать себе подписку, замочки на платных уроках исчезли.

- [ ] **Step 4: Commit** — `feat: admin users page with manual subscription grants`

### Task 3.4: Generic webhook платёжки

**Files:**
- Create: `src/app/api/webhooks/payment/route.ts`

- [ ] **Step 1: Endpoint** — POST с заголовком `x-webhook-secret` (сверка с `PAYMENT_WEBHOOK_SECRET`); тело `{ uid, plan, periodDays }` → `grantSubscription(uid, { status: 'active', plan, source: 'payment', startsAt: Date.now(), expiresAt: Date.now() + periodDays * 86400_000, grantedBy: null })`. При неверном секрете — 401. Адаптер под конкретного провайдера (подпись, формат тела) — отдельный план после выбора провайдера.

- [ ] **Step 2: Проверка** — `curl -X POST localhost:3000/api/webhooks/payment -H "x-webhook-secret: ..." -d '{"uid":"...","plan":"base","periodDays":30}'` → подписка появилась в Firestore.

- [ ] **Step 3: Commit** — `feat: generic payment webhook`

---

## Фаза 4: B2B — партнёры и атрибуция

### Task 4.1: Партнёрские ссылки и брендинг

**Files:**
- Create: `src/app/r/[slug]/route.ts`, `src/components/partner-bar.tsx`, `src/lib/db/partners.ts`
- Modify: `src/app/(app)/layout.tsx`, `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Роут партнёрской ссылки** (лендинги ссылаются на `https://платформа/r/acme?utm_source=...`):

```ts
// src/app/r/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = NextResponse.redirect(new URL('/register', req.url));
  res.cookies.set('partner', slug, { maxAge: 60 * 60 * 24 * 30, path: '/' });
  return res;
}
```

(utm из query уже подхватывает middleware из Task 1.2.)

- [ ] **Step 2: Слой партнёров** — `src/lib/db/partners.ts`: `getPartnerBySlug(slug)` (с `unstable_cache`, тег `partners`), `listPartners()`, `savePartner()`, `deletePartner()`.

- [ ] **Step 3: PartnerBar** — серверный компонент: если у пользователя `partnerId` (или есть cookie `partner` на страницах auth) — полоса вверху: логотип, «Вы пришли от {name}», фон `brandColor`. Вставить в layout группы `(app)` и `(auth)` — юзер видит, от кого пришёл, и до, и после регистрации.

- [ ] **Step 4: Проверка вручную** — переход по `/r/<slug>` показывает брендинг на /register; зарегистрированный через ссылку юзер видит PartnerBar и имеет `partnerId` в Firestore.

- [ ] **Step 5: Commit** — `feat: partner links and branding bar`

### Task 4.2: CRUD партнёров в админке

**Files:**
- Create: `src/app/admin/partners/page.tsx`, `src/app/admin/partners/actions.ts`

- [ ] **Step 1: Страница** — таблица партнёров (name, slug, active, число приведённых юзеров — count по `users.partnerId`), диалог создания/редактирования: name, slug, logoUrl (загрузка в Storage), brandColor, active. Actions с проверкой admin + `revalidateTag('partners')`. Готовая ссылка `/r/{slug}` с кнопкой «копировать».

- [ ] **Step 2: Commit** — `feat: admin partners CRUD`

---

## Фаза 5: Аналитика и воронки (PostHog)

### Task 5.1: Интеграция PostHog

**Files:**
- Create: `src/lib/analytics/posthog-client.tsx`, `src/lib/analytics/posthog-server.ts`, `src/lib/analytics/events.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Установка** — `npm i posthog-js posthog-node`

- [ ] **Step 2: Типизированные события**

```ts
// src/lib/analytics/events.ts
export const EVENTS = {
  signupCompleted: 'signup_completed',     // props: partnerId, utm_source
  courseOpened: 'course_opened',           // props: courseId
  lessonOpened: 'lesson_opened',           // props: courseId, lessonId, locked
  lessonCompleted: 'lesson_completed',     // props: courseId, lessonId
  paywallViewed: 'paywall_viewed',         // props: courseId, lessonId
  subscribeClicked: 'subscribe_clicked',   // props: place
  subscriptionActivated: 'subscription_activated', // props: plan, source
} as const;
```

- [ ] **Step 3: Клиент** — `posthog-client.tsx`: провайдер `'use client'`, `posthog.init(key, { api_host, capture_pageview: true })`, `identify(uid, { email, partnerId })` после логина; обернуть в корневом layout. **Сервер** — `posthog-server.ts`: singleton `PostHog` из `posthog-node`; серверные события: `signup_completed` (в `createUserProfile`), `subscription_activated` (в `grantSubscription` и webhook).

- [ ] **Step 4: Расставить клиентские события** — `lesson_opened` и `paywall_viewed` на странице урока, `lesson_completed` в action прогресса, `subscribe_clicked` на кнопке paywall-баннера.

- [ ] **Step 5: Проверка** — события видны в PostHog Live Events.

- [ ] **Step 6: Commit** — `feat: posthog analytics with typed events`

### Task 5.2: Воронки

**Files:**
- Create: `docs/analytics-funnels.md`

- [ ] **Step 1: Настроить в PostHog и задокументировать три воронки:**
  1. **Регистрация:** `$pageview (/login|/register)` → `signup_completed` — разрез по `utm_source` и `partnerId` (эффективность лендингов и B2B-партнёров).
  2. **Вовлечение:** `signup_completed` → `lesson_opened` → `lesson_completed`.
  3. **Монетизация:** `paywall_viewed` → `subscribe_clicked` → `subscription_activated`.

- [ ] **Step 2: Commit** — `docs: analytics funnel definitions`

---

## Фаза 6: Производительность и деплой

### Task 6.1: Оптимизация

- [ ] Обложки через `next/image` с явными `sizes`; обложки в Storage сохранять как webp.
- [ ] Проверить, что главная и страница урока — RSC без лишних client components (`'use client'` только: формы auth, кнопка прогресса, posthog-провайдер, paywall-кнопка).
- [ ] `npm run build` → в выводе убедиться, что страницы каталога не в `dynamic` без причины; bundle первой загрузки < 150KB.
- [ ] Lighthouse на главной (prod-сборка): Performance ≥ 90.
- [ ] Commit — `perf: image and bundle optimization`

### Task 6.2: Деплой на Vercel

- [ ] `vercel link` + перенос env (`vercel env add` для всех ключей из `.env.example`).
- [ ] Прод-деплой, прогон смоук-сценария: регистрация → карусели → урок → замочек → админка → выдача подписки → замочек исчез → события в PostHog.
- [ ] Commit оставшихся правок — `chore: production deploy config`

---

## Вне этого плана (отдельные планы после решений пользователя)

1. **Прямая загрузка видео из админки** — после выбора видеохостинга (рекомендация: Kinescope для РФ / Mux глобально): API-загрузка, статусы обработки, JS-API плеера для автоматического прогресса по % просмотра.
2. **Платёжный провайдер** (ЮKassa / CloudPayments / Stripe) — адаптер к webhook из Task 3.4, страница тарифов, рекуррентные списания.
3. **B2B-биллинг** — оптовая выдача подписок партнёром (source: 'b2b'), CSV-импорт сотрудников, отдельный кабинет партнёра.
