import { NextRequest, NextResponse } from 'next/server';
import {
  HOME_VARIANT_PARAM,
  SCENE_PATH,
  isHomeVariant,
  pickHomeVariant,
} from '@/lib/home-experiment';
import { parseTestRub } from '@/lib/payments/tariffs';
import {
  LANDING_PAIRS_COOKIE,
  LANDING_PAIRS_TTL,
  isPairsVariant,
  rollPairsVariant,
  AGENTS_BLOCKS_COOKIE,
  AGENTS_BLOCKS_TTL,
  isAgentsLandingVariant,
  rollAgentsLandingVariant,
} from '@/lib/landing-blocks';

// Публичный сайт целиком открыт гостям: витрины, лендинги, бесплатные уроки и юр. документы
const PUBLIC = [
  '/login', '/register', '/r/', '/api/',
  '/courses', '/waitlist', '/free', '/guide', '/faq', '/legal', '/payment', '/blog', '/reviews', '/student',
  // карта сайта, robots и llms.txt должны отдаваться роботам без сессии
  '/sitemap.xml', '/robots.txt', '/llms.txt',
  // файл подтверждения прав в Яндекс.Вебмастере: лежит в public/, робот ходит без сессии
  '/yandex_',
];

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  // главная ('/') открыта гостям — точное совпадение, чтобы не распахнуть весь сайт через startsWith
  const isPublic = pathname === '/' || PUBLIC.some((p) => pathname.startsWith(p));
  // id посетителя для A/B-тестов баннеров и главной: живёт год, гостям тоже нужен.
  // Свежий id прокидываем в заголовок запроса — иначе первый рендер его не увидит
  // и все новые посетители получили бы один и тот же вариант.
  const known = req.cookies.get('vid')?.value;
  const valid = known && /^[\w-]{8,64}$/.test(known) ? known : null;
  const vid = valid ? null : crypto.randomUUID();
  const headers = new Headers(req.headers);
  if (vid) headers.set('cookie', [req.headers.get('cookie'), `vid=${vid}`].filter(Boolean).join('; '));

  // Вариант главной: ручной выбор (?home=scene) сильнее жребия и запоминается,
  // чтобы при переходах по сайту и возврате на главную вариант не «прыгал»
  const asked = searchParams.get(HOME_VARIANT_PARAM);
  const forced = isHomeVariant(asked) ? asked : null;
  const remembered = req.cookies.get(HOME_VARIANT_PARAM)?.value;
  const variant = forced ?? (isHomeVariant(remembered) ? remembered : pickHomeVariant(valid ?? vid!));

  // Вариант лендинга вайбкода (ступень 2, пары блоков): жребий бросаем здесь, чтобы
  // запомнить его на сутки. Свежий вариант, как и vid, прокидываем в заголовок —
  // иначе первый рендер его не увидит и страница разошлась бы с cookie.
  const wantsLanding = pathname.startsWith('/courses/vibecoding');
  const rememberedPairs = req.cookies.get(LANDING_PAIRS_COOKIE)?.value;
  const pairsVariant =
    wantsLanding && !isPairsVariant(rememberedPairs) ? rollPairsVariant(valid ?? vid!) : null;
  if (pairsVariant) {
    headers.set('cookie', [headers.get('cookie'), `${LANDING_PAIRS_COOKIE}=${pairsVariant}`].filter(Boolean).join('; '));
  }

  // Вариант лендинга новичков: жребий бросаем здесь, чтобы запомнить его на сутки
  // в cookie. Свежий вариант, как и vid, прокидываем в заголовок — иначе первый
  // рендер его не увидит и человек получил бы один набор блоков, а cookie — другой.
  const wantsAgentsLanding = pathname.startsWith('/courses/claude-code-agents');
  const rememberedAgentsBlocks = req.cookies.get(AGENTS_BLOCKS_COOKIE)?.value;
  const agentsLandingVariant =
    wantsAgentsLanding && !isAgentsLandingVariant(rememberedAgentsBlocks)
      ? rollAgentsLandingVariant(valid ?? vid!)
      : null;
  if (agentsLandingVariant) {
    headers.set(
      'cookie',
      [headers.get('cookie'), `${AGENTS_BLOCKS_COOKIE}=${agentsLandingVariant}`].filter(Boolean).join('; '),
    );
  }

  const request = { headers };
  // Сцена — витрина для гостя. Вошедшему главная нужна учебная: на ней его уроки
  // и цель пункта шапки «Моё обучение», а на сцене нет ни того, ни другого.
  const authed = req.cookies.has('session');
  // сцена — не отдельная страница, а второй вариант главной: адрес остаётся '/'
  const res = pathname.startsWith(SCENE_PATH)
    ? NextResponse.redirect(new URL(authed ? '/' : `/?${HOME_VARIANT_PARAM}=scene`, req.url))
    : !isPublic && !authed
      ? NextResponse.redirect(new URL('/login', req.url))
      : pathname === '/' && variant === 'scene' && !authed
        // query главной едет вместе с рерайтом: по ней страница сцены читает
        // принудительный вариант своего теста (?exp_home_offer=…)
        ? NextResponse.rewrite(new URL(`${SCENE_PATH}${req.nextUrl.search}`, req.url), { request })
        : NextResponse.next({ request });
  if (vid) res.cookies.set('vid', vid, { maxAge: 60 * 60 * 24 * 365, path: '/', sameSite: 'lax' });
  if (pairsVariant) {
    res.cookies.set(LANDING_PAIRS_COOKIE, pairsVariant, { maxAge: LANDING_PAIRS_TTL, path: '/', sameSite: 'lax' });
  }

  if (agentsLandingVariant) {
    res.cookies.set(AGENTS_BLOCKS_COOKIE, agentsLandingVariant, { maxAge: AGENTS_BLOCKS_TTL, path: '/', sameSite: 'lax' });
  }
  if (forced) res.cookies.set(HOME_VARIANT_PARAM, forced, { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax' });

  // сохраняем utm-метки с любого лендинга до момента регистрации
  const utm: Record<string, string> = {};
  for (const [k, v] of searchParams) if (k.startsWith('utm_')) utm[k] = v;
  if (Object.keys(utm).length) {
    res.cookies.set('utm', JSON.stringify(utm), { maxAge: 60 * 60 * 24 * 30, path: '/' });
  }
  const ref = searchParams.get('ref');
  // мусорный ref не пишем в cookie — тот же guard, что в /r/[slug]
  if (ref && /^[a-z0-9-]{1,64}$/.test(ref)) {
    res.cookies.set('partner', ref, { maxAge: 60 * 60 * 24 * 30, path: '/' });
  }
  const fromParam = searchParams.get('from');
  if (fromParam && /^[a-z0-9_-]{1,64}$/.test(fromParam)) {
    res.cookies.set('from_landing', fromParam, { maxAge: 60 * 60 * 24 * 30, path: '/' });
  }

  // Секретный режим тестовой цены (?test_rub=N — оплата на N рублей, ?test_rub=0 для отключения)
  const testRubParam = searchParams.get('test_rub');
  const testRub = parseTestRub(testRubParam);
  if (testRub) {
    res.cookies.set('test_rub', String(testRub), { maxAge: 60 * 60 * 24, path: '/', sameSite: 'lax' });
  } else if (testRubParam === '0') {
    res.cookies.set('test_rub', '', { maxAge: 0, path: '/' });
  }
  return res;
}

export const config = { matcher: ['/((?!_next|favicon.ico|.*\\.(?:png|jpg|svg|webp|avif)).*)'] };
