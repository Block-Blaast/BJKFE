import type { ReactNode } from 'react';

import MobileTabBar from '@/components/layout/MobileTabBar';

const MobileTabsLayout = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
      <MobileTabBar />
    </>
  );
};

export default MobileTabsLayout;
