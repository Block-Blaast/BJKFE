import type { Metadata, Viewport } from 'next';

import { pretendard } from '@bjk/ui/fonts';

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
    <html lang="ko" className={`${pretendard.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
