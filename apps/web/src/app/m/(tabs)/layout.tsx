import type { ReactNode } from 'react';

import MobileTabBar from '@/components/layout/MobileTabBar';

// 화면 높이를 고정하고 본문만 스크롤한다. 채팅 입력창처럼 탭 바 바로 위에 붙어야 하는 UI 가 있어서다.
const MobileTabsLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex h-dvh flex-col">
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6">{children}</main>
      <MobileTabBar />
    </div>
  );
};

export default MobileTabsLayout;
