// Распознавание ботов и ИИ-краулеров по User-Agent и флагам автоматизации.

const BOT_PATTERN =
  /([a-z0-9_-]*bot\b|crawler|spider|slurp|headless|phantomjs|selenium|puppeteer|playwright|chatgpt|gptbot|claudebot|claude-web|anthropic|perplexity|bytespider|ccbot|applebot|meta-externalagent|facebookexternalhit|cohere|diffbot|omgili|youbot|google-extended|curl\/|wget\/|python-requests|aiohttp|scrapy|go-http-client|axios\/|node-fetch)/i;

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
