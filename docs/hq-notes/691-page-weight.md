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

## 4. Вердикт
Порог не пройден: First Load JS существенно выше 200 kB (786–832 kB uncompressed, 231–243 kB gzip), и обнаружен отдельный тяжёлый прикладной блок более 100 kB (Firebase Client SDK, 110.9 kB).
Есть понятная точка оптимизации: вынос модалки оплаты (`PaymentModal`) в `next/dynamic` с отложенной загрузкой по клику позволит убрать ~111 kB неиспользуемого на первом экране Firebase JS со всех публичных страниц.
