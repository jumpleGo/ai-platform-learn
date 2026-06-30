import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // загрузка превью-обложек уроков через server actions
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
};

export default nextConfig;
