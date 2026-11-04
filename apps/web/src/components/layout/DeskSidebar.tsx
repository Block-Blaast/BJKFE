import Link from 'next/link';
import { Suspense } from 'react';

import DeskNav from './DeskNav';
import DeskNavList from './DeskNavList';

// cacheComponents 에서는 동적 경로(/parts/[id])를 미리 렌더링할 때 현재 경로를 알 수 없다.
// 메뉴는 활성 표시 없이 먼저 그리고, 경로를 읽은 뒤 활성 표시를 붙인다.
const DeskSidebar = () => {
  return (
    <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col gap-6 border-r border-border-default bg-bg-surface px-3 py-6">
      <Link href="/dashboard" className="px-3 text-h3 text-text-heading">
        발주콕
      </Link>
      <nav>
        <Suspense fallback={<DeskNavList pathname={null} />}>
          <DeskNav />
        </Suspense>
      </nav>
    </aside>
  );
};

export default DeskSidebar;
