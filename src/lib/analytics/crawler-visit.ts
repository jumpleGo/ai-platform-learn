import type { NextFetchEvent, NextRequest } from 'next/server';
import { detectBot } from '@/lib/analytics/bot-detection';

// Учёт обращений краулеров и ИИ-ботов к /llms.txt и /blog/* отдельно от
// показов тестов и воронки. Ответ страницы не меняется. Вызывается из src/proxy.ts
// (Next 16 не допускает одновременно middleware.ts и proxy.ts).
export function trackCrawlerVisit(request: NextRequest, event?: NextFetchEvent): void {
  // Без объекта события отправку нельзя привязать к жизни запроса: не шлём ничего.
  if (!event) return;
  const { pathname } = request.nextUrl;
  if (pathname !== '/llms.txt' && !pathname.startsWith('/blog/')) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const bot = detectBot(request.headers.get('user-agent'));
  if (key && bot) {
    const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/+$/, '');
    try {
      event.waitUntil(
        fetch(`${host}/capture/`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            api_key: key,
            event: 'crawler_visit',
            distinct_id: `crawler:${bot.botName}`,
            properties: {
              path: request.nextUrl.pathname,
              bot_name: bot.botName,
              ua_family: bot.uaFamily,
              $process_person_profile: false,
            },
          }),
        }).then(() => undefined, () => undefined),
      );
    } catch {
      // Ошибка отправки не должна влиять на ответ.
    }
  }
}
