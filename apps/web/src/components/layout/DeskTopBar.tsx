import { Settings, Target } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import DeskNav from './DeskNav';
import DeskNavList from './DeskNavList';

// PC 상단 바 — 로고 · 알약 내비 · 원형 아이콘 버튼 (2026-11-05 개편, 참고: Boltshift)
// cacheComponents 에서는 동적 경로(/parts/[id])를 미리 렌더링할 때 현재 경로를 알 수 없다.
// 내비는 활성 표시 없이 먼저 그리고, 경로를 읽은 뒤 활성 표시를 붙인다.
const DeskTopBar = () => {
  return (
    <header className="flex items-center gap-4 rounded-full bg-bg-surface py-2 pr-2 pl-3 shadow-card">
      <Link href="/dashboard" className="flex shrink-0 items-center gap-2 pr-2">
        {/* "콕 짚는다" — 과녁 */}
        <span className="flex size-10 items-center justify-center rounded-full bg-bg-brand text-text-on-brand">
          <Target size={20} aria-hidden />
        </span>
        <span className="text-h3 text-text-heading">발주콕</span>
      </Link>

      <nav aria-label="주 메뉴" className="flex flex-1 justify-center">
        <Suspense fallback={<DeskNavList pathname={null} />}>
          <DeskNav />
        </Suspense>
      </nav>

      <Link
        href="/settings"
        aria-label="직원·설정"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-body transition-colors hover:bg-bg-brand-subtle hover:text-text-brand"
      >
        <Settings size={20} aria-hidden />
      </Link>
    </header>
  );
};

export default DeskTopBar;
