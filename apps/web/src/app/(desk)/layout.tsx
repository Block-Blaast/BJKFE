import type { ReactNode } from 'react';

import DeskTopBar from '@/components/layout/DeskTopBar';

// 웹 화면(PC). 데스크톱 전용이라 최소 폭(1280px)을 둔다.
// 회색 바탕 → 옅은 패널 → 흰 카드 3겹으로 카드가 떠 보이게 한다 (design-system.md "화면 인상").
const DeskLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-dvh min-w-7xl flex-col bg-bg-canvas p-5">
      <div className="flex flex-1 flex-col gap-6 rounded-xl bg-bg-page p-6">
        <DeskTopBar />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
};

export default DeskLayout;
