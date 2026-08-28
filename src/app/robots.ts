import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Закрываем от индексации личное и служебное: кабинет, вход, юр. документы, API
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '',
      allow: '/',
      disallow: ['/admin', '/api', '/login', '/register', '/legal', '/r/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
