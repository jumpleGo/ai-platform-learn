// Распознавание ботов и ИИ-краулеров по User-Agent и флагам автоматизации.

const BOT_PATTERN =
  /([a-z0-9_-]*bot\b|crawler|spider|slurp|headless|phantomjs|selenium|puppeteer|playwright|chatgpt|gptbot|claudebot|claude-web|anthropic|perplexity|bytespider|ccbot|applebot|meta-externalagent|facebookexternalhit|cohere|diffbot|omgili|youbot|google-extended|curl\/|wget\/|python-requests|aiohttp|scrapy|go-http-client|axios\/|node-fetch)/i;

const AI_PATTERN =
  /(chatgpt|gptbot|oai-searchbot|claudebot|claude-web|anthropic|perplexity|bytespider|ccbot|meta-externalagent|cohere|diffbot|omgili|youbot|google-extended|applebot-extended)/i;
const SCRIPT_PATTERN =
  /(headless|phantomjs|selenium|puppeteer|playwright|curl\/|wget\/|python-requests|aiohttp|scrapy|go-http-client|axios\/|node-fetch)/i;

export type BotMatch = { botName: string; uaFamily: 'ai_crawler' | 'script' | 'search_crawler' };

/** Распознаёт бота по User-Agent: имя совпавшего признака и семейство. Для людей — null. */
export function detectBot(userAgent: string | null | undefined): BotMatch | null {
  if (typeof userAgent !== 'string') return null;
  const match = BOT_PATTERN.exec(userAgent);
  if (!match) return null;
  const uaFamily = AI_PATTERN.test(userAgent) ? 'ai_crawler' : SCRIPT_PATTERN.test(userAgent) ? 'script' : 'search_crawler';
  return { botName: match[0].toLowerCase(), uaFamily };
}

/**
 * Проверяет, является ли посетитель поисковым роботом, ИИ-краулером или автоматическим скриптом.
 * Если передан userAgent, проверяет переданную строку.
 * В браузерном окружении без аргументов проверяет navigator.webdriver и navigator.userAgent.
 */
export function isBot(userAgent?: string | null): boolean {
  if (typeof userAgent === 'string') {
    return BOT_PATTERN.test(userAgent);
  }
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined') {
    if (navigator.webdriver) return true;
    if (navigator.userAgent) {
      return BOT_PATTERN.test(navigator.userAgent);
    }
  }
  return false;
}
