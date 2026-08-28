import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Просмотр dev-сборки с телефона: запросы к /_next приходят с адреса в
  // локальной сети, и без этого списка Next их блокирует — страница
  // отрисовывается, но React не монтируется и ничего не работает.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '*.local'],
  // загрузка превью-обложек уроков через server actions
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
};

export default nextConfig;
