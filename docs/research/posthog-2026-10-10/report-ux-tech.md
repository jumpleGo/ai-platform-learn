# Отчёт: трение и технические причины ухода (UX + perf)

Период: 29.09–10.10.2026 (n = 2309 сессий), для сравнения 17.09 (n = 2595). Источники: sessions.jsonl, HogQL к PostHog (проект 259690), код репо, замеры прода headless Chrome (390×844, iPhone/Instagram UA, Fast 4G и Slow 4G + CPU×4), краулер ссылок прода.

## TL;DR — приоритеты

| # | Проблема | Доказательство | Prio |
|---|----------|----------------|------|
| 1 | Прайсинг/оплата не работает для зарубежной аудитории: цены только в ₽, кнопка «Перейти к оплате» с логотипами СБП/МИР/Т-Банк/SberPay, T-Bank эквайринг. 72% трафика — DE/NL/US/GB/PL/FI/KZ/UA | pricing_viewed 442 → tariff_selected 3 (0,7%) → payment_started 0. Реальных оплат за 12 дней — 0 | P0 |
| 2 | /guide на Android — сломанный лид-магнит: location.replace(pdf) в Instagram-WebView не открывает PDF, человек видит «Открываем гайд…» и тыкает ссылку | Android: 21,6% кликают «нажмите сюда» (122 из 565), 6 кликают повторно, 37% сидят >90 с; iOS: 2,1% кликов, 85,6% уходят ≤2 с (редирект сработал) | P0 |
| 3 | «Мгновенные уходы» на iOS — в основном артефакт измерения: Instagram-WebView на iOS не отдаёт $pageleave (1609 PV → 636 leaves), поэтому dur_s = 0 у вовлечённых людей | iOS «instant» 39,5% vs Android 16,3%; при этом pricing_viewed на iOS 51% (выше Android 38%) | P1 (аналитика) |
| 4 | Сервер медленный: TTFB 0,75–1,0 с на всех страницах, статические чанки по 10 КБ отдаются 1,3–2,4 с | curl ×3: / 0,79–0,94 с, /guide 1,03 с (страница из 44 строк); LCP 2,4–3,0 с Fast 4G, 3,8–5,3 с Slow 4G | P1 |
| 5 | «Личка» в шапке и «Написать в личку» ведут в канал t.me/gelato_ai, а не в ЛС автора (t.me/rrotatew) | TELEGRAM_DM = 'https://t.me/gelato_ai' в src/lib/site.ts:8; 18 кликов «Личка», после 6 — конец сессии | P1 |
| 6 | Rage/dead clicks на лендингах почти нет; шумят FAQ-аккордеон и бургер-меню (работают). Rage на /courses/claude-code-agents: бургер (2) и крестик (1) | 45 $rageclick всего, из них 33 — monitoring.moneyflowzen.ru (/charts, /analyze — чужой сайт в том же проекте PostHog) | P3 |
| 7 | Ошибок нет: $exception не включён, drawings_save_error 1 — тоже moneyflowzen.ru; 404 на внутренних ссылках — 0 (26 внутренних href, все 200) | краулер 11 страниц прода; PV по неизвестным путям: /courses/c ×1 | — |

## 1. Rage clicks и «мёртвые» клики

### $rageclick (с 15.09, n = 45)
- 33 из 45 — /charts, /analyze, /analyses домена monitoring.moneyflowzen.ru (другой продукт, тот же проект PostHog). К gelato не относятся.
- На gelato (12):
  - /courses/claude-code-agents ×3 (17.09, Android Chrome): бургер button[aria-label="Открыть меню"] (sid 01a0af82-c8df…, две rage-серии подряд «Открыть/Закрыть меню») и крестик svg.lucide-x (sid 01a0af64-f34b…). Открыл меню, не нашёл нужного (в меню нет «Тарифы»/«Бесплатный урок»), щёлкал по крестику/бургеру.
  - /courses/vibecoding ×2 (iOS, 30.09 и 01.10): svg.lucide-chevron-down — стрелка FAQ-аккордеона (details/summary, page.tsx:1294–1381). svg aria-hidden 16px внутри summary; на iOS тап по иконке иногда не раскрывает — тапают 3+ раза.
  - / ×2 (.mon-trial-modal__close, #trial-email-input) — Vue data-v-атрибуты, moneyflowzen. /courses ×1, /faq ×1 (summary), /login ×1 (форма), /courses/claude-code-agents/lessons/2 ×1 («Войти»).

### «Мёртвые» клики (клик без href, после которого LEAVE/конец/тот же элемент), с 29.09, /courses/vibecoding
| Элемент | Кликов/сессий | Dead | Что это |
|---|---|---|---|
| span.group-open:rotate-180 (кружок-стрелка summary) | 44/21 | 9 | FAQ-аккордеон, работает |
| svg.lucide-chevron-down | 35/19 | 10 | FAQ |
| button[aria-label=Открыть меню] | 31/26 | 9 | бургер; дальше чаще «Бесплатные материалы» → /free (36) |
| svg.lucide-menu | 24/24 | — | бургер |
| табы ProofInspector «1. Правила / 2. Реальный diff / 3. Автопроверки» | 15/6 | 1 | src/components/proof-inspector.tsx; 2,5 клика на человека, pre с кодом на 390px уходит в горизонтальный скролл |
| button "закрыть" (модалка оплаты) | 2/2 | 2 | закрыли после «Оформить» (EE, MD) |

Вывод: по-настоящему мёртвых элементов нет; «dead» — последний клик в аккордеоне/меню перед уходом. Сигналы: FAQ дочитывают и уходят (последние клики: «Сколько времени занимает обучение?» ×7, «Как и когда открывается доступ?» ×4); повторные клики по табам инспектора; бургер открывают 26 человек — в меню нет прайсинга и бесплатного урока. Повторных кликов подряд по одному элементу (кроме табов и rage) — 0.

## 2. Мгновенные уходы

Определение: dur_s ≤ 2, один PV, нет LEAVE. С 29.09: 675 из 2309 (29,2%).

| Разрез | n | instant |
|---|---|---|
| /guide | 1261 | 36,4% (dur ≤2 с — 58%) |
| /courses/vibecoding | 815 | 18,3% |
| / | 193 | 23,3% |
| iOS | 1239 | 39,5% |
| Android | 996 | 16,3% |
| l.instagram.com | 2129 | 28,4% |
| $direct | 152 | 42,1% |
| по дням | 30.09 30%, 01.10 37%, 02.10 34%, 03–05.10 12–18%, 06.10 31% | |
| гео | DE 34%, US 36%, NL 30%, RU 25%, KZ 28% — различий нет | |
| ширина | 380–439px 30–33%, <380 22% — различий нет | |

PostHog не отличает Instagram как браузер; по $raw_user_agent 2103 из 2309 сессий — Instagram in-app (iOS 1179, Android 924).

### 2a. /guide — это редирект, а не bounce
src/app/guide/guide-redirect.tsx: ждёт колбэк Метрики (до 1,5 с) и делает window.location.replace('/files/gelato-free-tokens-guide.pdf') (PDF 1,2 МБ, без Content-Disposition). Поэтому ≤2 с на /guide — норма.
- iOS (n=680): 85,6% уходят ≤2 с, «нажмите сюда» 2,1% (14) — PDF открылся в WebView. 8,1% потом приходят на /courses/vibecoding (ссылка из PDF).
- Android (n=565): ≤2 с только 24,6%; 21,6% (122) кликают «нажмите сюда», 6 — повторно; 211 (37%) сидят >90 с; 57 — повторный PV /guide. Медиана времени клика 11 с, p75 65 с. Android WebView не показывает PDF inline: replace на PDF либо тихо скачивает в фоне, либо ничего. Человек видит белый экран «Открываем гайд…». Примеры: 01a0f155-283a… (NL: PV → клик 36 с → LEAVE 188 с), 01a0f175-5675… (RU: клик 9 с, уход 18 с).
Исправление (P0): на /guide рендерить нормальную страницу: что внутри гайда, большая кнопка «Скачать PDF» (a download + target=_blank), запасной «Открыть в Telegram», сразу CTA на /courses/vibecoding и бесплатный урок; цель Метрики — по клику; для Android — Content-Disposition: attachment. Минимум: убрать ожидание 1,5 с (reachGoal + редирект сразу).

### 2b. iOS instant — артефакт $pageleave
PostHog 29.09–10.10: iOS Mobile Safari — 1609 $pageview, 636 $pageleave; Android Chrome — 1399 PV, 945 leaves. На iOS закрытие in-app браузера Instagram убивает WebView без pagehide. У 677 из 1229 iOS-сессий нет ни одного pageleave → dur_s занижен, «instant» = «не кликнул до закрытия».
Контроль: /courses/vibecoding iOS n=446 — pricing_viewed 51,1%, клики 25,8%, любая активность 72%; Android n=350 — pricing_viewed 37,7%, клики 26,0%, активность 90,9%. iOS доходят до тарифов чаще Android — они не «уходят мгновенно».
17.09 для сравнения (TikTok-реклама Traffic20260917132104, 383 сессии с pangleglobal.com): iOS instant 86,5%, Android 37,4% — там настоящие боты/префетч рекламной сети.
Исправление (P1): heartbeat-события (engaged_10s/30s по setInterval + visibilitychange), capture_performance web_vitals, Error tracking в posthog-client; bounce считать как «нет скролла/клика/heartbeat».

### 2c. Производительность (headless Chrome, прод, Instagram iPhone UA, 390×844)
| Страница | Профиль | TTFB | FCP | LCP | load | запросов | вес | long tasks |
|---|---|---|---|---|---|---|---|---|
| / | Fast 4G | 758 | 2220 | 2376 | 5474 | 62 | 1082 КБ | 164 мс |
| / | Slow 4G ×4 CPU | 802 | 2120 | 5324 | 8161 | 62 | 1082 КБ | 313 мс |
| /courses/vibecoding | Fast 4G | 846 | 1720 | 2992 | 5086 | 58 | 777 КБ | 80 мс |
| /courses/vibecoding | Slow 4G | 917 | 2304 | 3776 | 4348 | 56 | 769 КБ | 310 мс |
| /free | Fast 4G | 2089 | 2972 | 4688 | 6810 | 59 | 739 КБ | 72 мс |
| /free | Slow 4G | 1561 | 2872 | 4616 | 7424 | 59 | 739 КБ | 298 мс |

- GSAP нет; Lenis только в scene/gelateria-scene.tsx (главная); видео на лендингах нет; CLS 0. Тяжёлых анимаций нет.
- Главное — сервер: TTFB 0,75–1,0 с стабильно (curl ×3; /guide 1,03 с при 21 КБ HTML), каждый _next/static чанк 10–70 КБ грузится 1,3–2,4 с. JS ≈ 458 КБ на любой странице, Метрика ещё 94+13 КБ. LCP на /courses/vibecoding — H1 (ждёт Manrope woff2 24 КБ + BIPs.ttf 53 КБ), на / — scene/panel-1-1600.avif (84 КБ; все 5 панелей 435 КБ).
- Корреляции instant-доли с шириной/ОС/гео, которую дала бы тяжёлая загрузка, нет.
Исправления (P1): CDN/кэш перед VM (Cloudflare) для _next/static и страниц; ISR/revalidate для лендингов вместо SSR на каждый запрос; Метрика lazyOnload; на / priority только у panel-1, остальные lazy; display swap + preload Manrope.

## 3. Поведение на лендинге /courses/vibecoding и прайсинг

Воронка с 29.09: pricing_viewed 442 → клик «Оформить» 3 → tariff_selected 3 → payment_started 0 → оплат 0. Все payment_started/subscription_activated в проекте — VN, Mac/iOS, цена 10 ₽ (test_rub), 17.09 — тесты владельца.
- До тарифов доходят быстро: медиана 31 с от PV (p25 15 с). После pricing_viewed: 134 «END» (iOS без pageleave), 29 LEAVE на scroll=1.0, остальные на 0,55–0,95. Медиана «pricing_viewed → уход» 35 с (p25 16, p75 50). 315 из 442 после прайсинга не делают ничего.
- Гео pricing_viewed: DE 61, NL 54, US 32, RU 30, UZ 21, PL 19, KZ 18, SE 17 — >80% вне РФ.
- Трое открывших модалку: EE (Android, «Оформить за 19 900 ₽» → через 18 с «закрыть»; 01a0f067-623f…), PL (iOS, «Оформить за 7 900 ₽», дальше ничего; 01a0f42d-d495…), MD (Android, «закрыть»; 01a0f90c-a120…). Все зарубежные.

Что видит человек из DE/NL/US (tariff-cards.tsx, payment-modal.tsx):
1. Цены только «7 900 ₽ / 19 900 ₽». Ни €/$, ни «можно из-за рубежа».
2. В модалке: email, Telegram (обязателен для тарифа с поддержкой), кнопка «[лого СБП] Перейти к оплате 19 900 ₽», под ней логотипы СБП · МИР · Т-Банк · SberPay — для немецкой карты это «вам сюда нельзя».
3. Единственная альтернатива — серая 14px ссылка «Оплатить не банковской картой» → t.me/rrotatew. Формулировка сбивает (картой как раз хочется). 0 кликов.
4. /api/payments/init → T-Bank: зарубежные Visa/MC у российского эквайринга отклоняются — даже если бы дошли.

Остальные CTA:
- «К тарифам» (83) → pricing_viewed → у 19 из 80 дальше ничего; 3 → «Личка»; 3 → «Смотреть бесплатный урок».
- «Смотреть бесплатный урок» (48) → урок 4: 8 вернулись на лендинг, 7 запустили видео, 7 нажали CTA урока, 9 ушли с урока на scroll 0,01–0,9. Работает, но мало (6% входов).
- «Выбрать тариф» (34) → 8 просто pricing_viewed, 1 модалка (EE), 1 «Спросить автора в Telegram».
- «Личка» (18): после 6 — конец сессии. Ведёт в канал t.me/gelato_ai (site.ts:8, TELEGRAM_DM === TELEGRAM_CHANNEL), не в ЛС автора.
- Глубина ухода одностраничных (dur>2, n=364): равномерно 8–11% по децилям и 17,6% на 0,9–1,0 — четверть дочитывает до конца и уходит, не найдя, как действовать.

Исправления (P0):
1. Гео-зависимые цены и оплата: для не-RU «€79 / €199» (или $) и «Оплатить картой Visa/Mastercard» через Stripe/Paddle/Lemon Squeezy (Paddle/LS — merchant of record, без юрлица в ЕС); для RU — T-Bank. Минимум за день: под ценой «Зарубежная карта — напишите, выставлю счёт в €/$» и заметная кнопка → ЛС.
2. Логотипы СБП/МИР/SberPay только для RU; ссылку переименовать «Зарубежная карта / PayPal / крипта — написать автору» и поднять над кнопкой.
3. TELEGRAM_DM → https://t.me/rrotatew.
4. В бургер — «Тарифы», «Бесплатный урок».
5. «Возврат 100% за 2 дня» рядом с кнопкой, а не в подвале секции.
6. A/B (ab-testing): валюта/кнопка зарубежной оплаты — метрики tariff_selected, payment_started.

## 4. Ошибки и ссылки
- $exception не собирается ($exception_capture_enabled_server_side: false) — включить Error tracking.
- drawings_save_error ×1 (08.10, Safari, monitoring.moneyflowzen.ru/charts) — не gelato. Развести moneyflowzen и gelato по проектам PostHog или фильтровать по $host (33 из 45 rageclick — чужие).
- 404: краулер 11 страниц прода — 26 внутренних href, все 200; t.me — 200; linkedin.com/in/rrotatew — 999 (антибот). PV по несуществующим путям за месяц: /courses/c ×1. Якорь #pricing существует (page.tsx:1117).

## 5. Сводная таблица исправлений
| Prio | Что | Где | Эффект |
|---|---|---|---|
| P0 | Валюта и способ оплаты по гео, убрать РФ-логотипы для не-RU, заметная «оплата из-за рубежа» | tariff-cards.tsx, payment-modal.tsx, lib/payments/tariffs.ts, api/payments/init | единственный путь к оплате для 80% смотрящих прайсинг |
| P0 | /guide: страница с кнопкой «Скачать PDF» и CTA вместо auto-redirect; attachment для Android | src/app/guide/* | ~400 Android-лидов за всплеск получат гайд |
| P1 | TELEGRAM_DM → ЛС автора | src/lib/site.ts:8 | «Личка» ведёт в диалог |
| P1 | CDN/кэш для _next/static, ISR лендингов, Метрика lazyOnload | nginx/VM, page.tsx, yandex-metrika.tsx | TTFB 0,8 → <0,2 с, LCP −1,5–2 с на slow 4G |
| P1 | heartbeat + web vitals + error tracking; разделить проекты PostHog | lib/analytics/posthog-client | честный bounce на iOS |
| P2 | Бургер: «Тарифы», «Бесплатный урок»; FAQ summary — hit-area на всю строку | site-nav.tsx, page.tsx:1294+ | меньше rage |
| P2 | ProofInspector: табы в строку, pre с переносами на мобиле | proof-inspector.tsx | 2,5 клика → 1 |
| P3 | /: lazy для panel-2…5; swap+preload Manrope | gelateria-scene.tsx, layout.tsx | LCP главной −1 с |
