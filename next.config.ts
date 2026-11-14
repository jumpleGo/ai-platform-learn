import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Просмотр dev-сборки с телефона: запросы к /_next приходят с адреса в
  // локальной сети, и без этого списка Next их блокирует — страница
  // отрисовывается, но React не монтируется и ничего не работает.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '*.local'],
  // загрузка превью-обложек уроков через server actions
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  async redirects() {
    return [
      {
        // Confirmed legacy ID URL: redirect before the lesson starts streaming.
        source: '/courses/O9aFw3KZqEFyGxnJB8fX/lessons/CY4AYMjQMSbND8TUYSFQ',
        destination: '/courses/claude-code-agents/lessons/2',
        statusCode: 301,
      },
    ];
  },
  // файлы из public/ Next по умолчанию отдаёт без кеша (max-age=0) — сцена
  // весит ~2.7 МБ и без этого качается заново при каждом визите
  async headers() {
    return [
      {
        source: '/scene/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
    ];
  },
};

export default nextConfig;
