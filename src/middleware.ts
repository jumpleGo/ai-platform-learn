import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { detectBot } from '@/lib/analytics/bot-detection';

// Учёт обращений краулеров и ИИ-ботов к /llms.txt и /blog/* отдельно от
// показов тестов и воронки. Ответ страницы не меняется.
export function middleware(request: NextRequest, event: NextFetchEvent) {
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
  return NextResponse.next();
}

export const config = { matcher: ['/llms.txt', '/blog/:path*'] };
