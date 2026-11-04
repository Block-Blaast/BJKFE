import { Suspense } from 'react';

import MobileTabList from './MobileTabList';
import MobileTabs from './MobileTabs';

// 탭은 활성 표시 없이 먼저 그리고, 현재 경로를 읽은 뒤 활성 표시를 붙인다 (DeskSidebar 와 같은 이유).
const MobileTabBar = () => {
  return (
    <nav className="sticky bottom-0 border-t border-border-default bg-bg-surface pb-safe">
      <Suspense fallback={<MobileTabList pathname={null} />}>
        <MobileTabs />
      </Suspense>
    </nav>
  );
};

export default MobileTabBar;
