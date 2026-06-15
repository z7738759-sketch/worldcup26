import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === '1'

const nextConfig: NextConfig = {
  output: isStaticExport ? 'export' : undefined,
  // GitHub Pages 部署用 basePath（Vercel 部署时设为空字符串）
  basePath: process.env.GHPAGES_BASE || '',
  images: {
    unoptimized: isStaticExport,
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com' },
    ],
  },
};

export default nextConfig;
