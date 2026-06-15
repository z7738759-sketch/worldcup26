import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.STATIC_EXPORT === '1' ? 'export' : undefined,
  // GitHub Pages 部署用 basePath（Vercel 部署时设为空字符串）
  basePath: process.env.GHPAGES_BASE || '',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com' },
    ],
  },
};

export default nextConfig;
