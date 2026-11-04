import type { Metadata, Viewport } from 'next';

import { pretendard } from '@bjk/ui/fonts';

import MockProvider from '@/providers/mock-provider';
import QueryProvider from '@/providers/query-provider';

import './globals.css';

export const metadata: Metadata = {
  title: { default: '발주콕', template: '%s · 발주콕' },
  description: '발주의 문제를 콕 짚어주는 영세 제조 현장용 발주 검토 서비스',
};

export const viewport: Viewport = {
  viewportFit: 'cover',
};

const RootLayout = ({ children }: LayoutProps<'/'>) => {
  return (
    // 브라우저 확장(HWP 뷰어 등)이 <html> 에 속성을 붙여 하이드레이션 경고가 난다. <html> 속성 차이만 무시한다.
    <html lang="ko" className={`${pretendard.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <MockProvider>
          <QueryProvider>{children}</QueryProvider>
        </MockProvider>
      </body>
    </html>
  );
};

export default RootLayout;
