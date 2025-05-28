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
  // 개발 모드 최적화
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  // 개발 서버 설정
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  // 로깅 레벨 조정
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig; 