import type { Metadata } from 'next';

import { pretendard } from '@bjk/ui/fonts';

import QueryProvider from '@/providers/query-provider';

import './globals.css';

export const metadata: Metadata = {
  title: 'BJK',
  description: 'BJK',
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
