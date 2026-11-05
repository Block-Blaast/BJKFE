import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 워크스페이스 패키지는 빌드 없이 TS 소스를 그대로 내보내므로 앱이 함께 컴파일한다.
  transpilePackages: ['@bjk/api', '@bjk/ui'],
  cacheComponents: true,
  partialPrefetching: true,
  // 로컬 개발: /api/* 를 백엔드(API_PROXY_TARGET, 예: 배포 서버 주소)로 넘긴다. 운영은 Caddy 가 넘기므로 비워 둔다.
  // 브라우저는 같은 출처(/api)로 부르니 CORS 설정이 필요 없다.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET;
    return target ? [{ source: '/api/:path*', destination: `${target}/api/:path*` }] : [];
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
