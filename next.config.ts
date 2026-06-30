import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // загрузка превью-обложек уроков через server actions
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
};

export default nextConfig;
