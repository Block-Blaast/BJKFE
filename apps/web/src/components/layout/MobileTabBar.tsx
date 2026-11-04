import { Suspense } from 'react';

import MobileTabList from './MobileTabList';
import MobileTabs from './MobileTabs';

// 탭은 활성 표시 없이 먼저 그리고, 현재 경로를 읽은 뒤 활성 표시를 붙인다 (DeskTopBar 와 같은 이유).
const MobileTabBar = () => {
  return (
    <nav className="shrink-0 px-4 pt-2 pb-safe">
      <div className="pb-3">
        <Suspense fallback={<MobileTabList pathname={null} />}>
          <MobileTabs />
        </Suspense>
      </div>
    </nav>
  );
};

export default MobileTabBar;
