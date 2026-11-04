import type { ReactNode } from 'react';

import DeskSidebar from '@/components/layout/DeskSidebar';

// 웹 화면(PC). 데스크톱 전용이라 최소 폭(1280px)을 두고, 좁아지면 가로 스크롤한다.
const DeskLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-dvh min-w-7xl">
      <DeskSidebar />
      <main className="flex flex-1 flex-col px-8 py-8">{children}</main>
    </div>
  );
};

export default DeskLayout;
