# Задача #691: Замер веса и скорости страниц сайта

## Вводные
- Окружение: Next.js 16.2.9 (Turbopack), React 19.2.4, Node.js 22.21.0.
- Команда сборки: `export PATH=$HOME/.local/node/bin:$PATH && npx next build` (без изменений кода).
- Статус сборки: `BUILD=ok` (код возврата 0).
- Источник метрик: `.next/diagnostics/route-bundle-stats.json`, `.next/build-manifest.json` и замер размеров статических чанков (`.next/static/chunks/`).

---

## 1. Замеры веса страниц (First Load JS и размер страницы)

| Маршрут | Описание | First Load JS (uncompressed) | First Load JS (gzip) | Размер страницы (uncompressed) | Размер страницы (gzip) |
|---|---|---|---|---|---|
| `/` | Главная страница | 802.4 kB (802 443 B) | 237.1 kB (237 088 B) | 345.7 kB (345 670 B) | 104.8 kB (104 757 B) |
| `/courses/[courseSlug]` | Страница курса | 831.6 kB (831 590 B) | 243.4 kB (243 384 B) | 374.8 kB (374 817 B) | 111.1 kB (111 053 B) |
| `/blog/[slug]` | Статья блога | 786.7 kB (786 653 B) | 231.7 kB (231 680 B) | 329.9 kB (329 880 B) | 99.3 kB (99 344 B) |

---

## 2. Общий Shared JS

Общий размер разделяемых модулей (`rootMainFiles`):
- **Uncompressed**: **456.8 kB** (456 773 B)
- **Gzip**: **132.3 kB** (132 336 B)

Состав чанков Shared JS:
1. `static/chunks/0um2kh66idet2.js`: 226.4 kB (226 355 B uncompressed), gzip: 70.5 kB (70 534 B) — React DOM (`react-dom`, React runtime).
2. `static/chunks/08c7277ny3zun.js`: 137.4 kB (137 449 B uncompressed), gzip: 37.3 kB (37 274 B) — Next.js client router/runtime.
3. `static/chunks/27jktro2p5rq9.js`: 44.4 kB (44 414 B uncompressed), gzip: 9.2 kB (9 197 B).
4. `static/chunks/0rf23f4uc-a21.js`: 31.4 kB (31 396 B uncompressed), gzip: 8.8 kB (8 839 B).
5. `static/chunks/turbopack-3o3857109qfqz.js`: 10.6 kB (10 613 B uncompressed), gzip: 4.2 kB (4 170 B).
6. `static/chunks/2iho8jepmwwua.js`: 6.5 kB (6 546 B uncompressed), gzip: 2.3 kB (2 322 B).

---

## 3. Проверка порога закрытия и тяжёлых блоков

**Порог закрытия**:
> Если First Load JS каждой из трёх страниц меньше 200 kB и нет отдельного блока больше 100 kB — «ускорять нечего, советы не пробуем».

### Результат проверки:
1. **First Load JS**:
   - `/`: 802.4 kB uncompressed (237.1 kB gzip) — **превышает 200 kB** даже в сжатом виде.
   - `/courses/[courseSlug]`: 831.6 kB uncompressed (243.4 kB gzip) — **превышает 200 kB**.
   - `/blog/[slug]`: 786.7 kB uncompressed (231.7 kB gzip) — **превышает 200 kB**.

2. **Блоки больше 100 kB**:
   - `0um2kh66idet2.js` (226.4 kB uncompressed) — React DOM (базовый рантайм React).
   - `08c7277ny3zun.js` (137.4 kB uncompressed) — Next.js client runtime.
   - `41qdx51vcqs-k.js` (110.9 kB uncompressed, 32.5 kB gzip) — **Firebase Client SDK** (`firebase/app`, `firebase/auth`, `firebase/firestore`).
   - `1n3zsvsgphy1d.js` (104.6 kB uncompressed, 32.9 kB gzip) — Sonner + PostHog client + Lucide icons.

### Откуда импортируется самый тяжёлый прикладной блок (`41qdx51vcqs-k.js`, 110.9 kB):
- Источник: `src/lib/firebase/client.ts` (`initializeApp`, `getAuth`, `connectAuthEmulator`).
- Цепочки импорта:
  1. `src/app/layout.tsx` -> импортирует `PaymentModalProvider` из `src/components/payment/payment-modal-context.tsx` -> `src/components/payment/payment-modal.tsx` -> `clientAuth` из `@/lib/firebase/client`.
  2. `src/app/(app)/layout.tsx` -> импортирует `LogoutButton` из `src/components/logout-button.tsx` -> `clientAuth` из `@/lib/firebase/client`.
- Так как оба компонента подключены в корневых layout (`app/layout.tsx` и `app/(app)/layout.tsx`), Firebase Client SDK попадает во входной бандл абсолютно всех страниц сайта, включая главную, каталог курсов и блог.

---

## 4. Замер первого экрана на работающем сайте (LCP)
Условия: Chromium 156 (Playwright 1.64), окно 1366x768, новый контекст без cookies (гость) на каждое открытие, без троттлинга сети и CPU, ожидание 3 с после load. Сырой лог: `eval/lcp-raw.log` (вне git). Время LCP, мс; элемент LCP — картинка.

| Адрес | Открытия 1 / 2 / 3 | Элемент LCP |
|---|---|---|
| https://gelato.education/ | 2256 / 3292 / 1664 | `/logo.webp` (146 kB) |
| https://gelato.education/courses/vibecoding | 2408 / 1776 / 2016 | `/logo.webp` через `/_next/image` w=640 (4.5 kB) |
| https://gelato.education/blog/kak-sekonomit-na-ii | 2216 / 1060 / 1156 | обложка статьи (240 kB), в 2 и 3 открытиях — logo |

Ограничения: разброс большой (1.7–3.3 с на главной), три открытия не дают медианы с доверием; один клиент, одна сеть. Поле «байты JS по Content-Length» в логе UNRELIABLE (~222 kB почти везде, заголовок есть не у всех ответов) — размер кода брать из разделов 1–2. Размер кода и время появления — разные величины: связь между ними этим замером не доказана.

## 5. Вердикт
По размеру кода порог не пройден: First Load JS 786–832 kB (231–243 kB gzip), есть блок Firebase Client SDK 110.9 kB. Его подключают и модалка оплаты, и кнопка выхода (`LogoutButton`), поэтому отложенная загрузка одной модалки весь блок не уберёт — обещание не доказано. Вход и платежи не менять.

По времени LCP 1–3.3 с без троттлинга, элемент LCP — картинка, а не JS.

Что проверять дальше: (1) повтор замера с троттлингом (мобильный профиль) и ≥10 открытий на адрес; (2) выяснить, что тянет Firebase в общий бандл, и можно ли отделить без правок входа/оплаты; (3) оценить размер/приоритет картинки LCP (logo.webp 146 kB на главной). Ускорение этой заметкой не достигнуто и не заявляется.
