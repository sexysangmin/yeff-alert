/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // React Strict Mode 비활성화 (지도 중복 초기화 방지)
  reactStrictMode: false,
  // 개발 중 hydration 경고 임시 무시
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false,
  },
};

export default nextConfig; 