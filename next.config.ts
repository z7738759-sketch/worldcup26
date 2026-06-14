import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages 部署用 basePath（Vercel 部署时设为空字符串）
  basePath: process.env.GHPAGES === '1' ? '/worldcup26' : '',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com' },
    ],
  },
};

export default nextConfig;
