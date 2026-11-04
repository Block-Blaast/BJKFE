import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 워크스페이스 패키지는 빌드 없이 TS 소스를 그대로 내보내므로 앱이 함께 컴파일한다.
  transpilePackages: ['@bjk/api'],
  cacheComponents: true,
  partialPrefetching: true,
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
