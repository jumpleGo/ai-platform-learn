import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Закрываем от индексации личное и служебное: кабинет, вход, юр. документы, API
const DISALLOW = ['/admin', '/api', '/login', '/register', '/legal', '/r/', '/payment'];

// Краулеры ИИ-поиска (ChatGPT, Perplexity, Claude, Gemini/AI Overviews).
// Перечисляем явно: часть из них игнорирует общее правило «*», а нам важно,
// чтобы уроки и лендинги попадали в ответы ассистентов.
const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'YandexBot',
  'meta-externalagent',
  'Amazonbot',
  'cohere-ai',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
