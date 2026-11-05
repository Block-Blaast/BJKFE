import { Settings, Target } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { DESK_DASHBOARD, DESK_SETTINGS } from '@/constants/routes';

import FlowBand, { FlowBandFallback } from './FlowBand';

// PC 상단 바 — 로고(오늘 대시보드 입구) · 발주 흐름 내비 · 원형 아이콘 버튼 (2026-11-05 개편, 참고: Boltshift)
// cacheComponents 에서는 동적 경로(/parts/[id])를 미리 렌더링할 때 현재 경로를 알 수 없다.
// 내비는 활성 표시 없이 먼저 그리고, 경로를 읽은 뒤 활성 표시를 붙인다.
// 흐름 5단계가 1280px 에 들어가도록 로고 글자는 넓은 화면(2xl)에서만 보인다.
const DeskTopBar = () => {
  return (
    <header className="flex items-center gap-4 rounded-full bg-bg-surface py-2 pr-2 pl-3 shadow-card">
      <Link
        href={DESK_DASHBOARD.href}
        aria-label={DESK_DASHBOARD.label}
        className="flex shrink-0 items-center gap-2"
      >
        {/* "콕 짚는다" — 과녁 */}
        <span className="flex size-10 items-center justify-center rounded-full bg-bg-brand text-text-on-brand">
          <Target size={20} aria-hidden />
        </span>
        <span aria-hidden className="hidden pr-2 text-h3 text-text-heading 2xl:inline">
          발주콕
        </span>
      </Link>

      <nav aria-label="발주 흐름" className="flex flex-1 justify-center">
        <Suspense fallback={<FlowBandFallback />}>
          <FlowBand />
        </Suspense>
      </nav>

      <Link
        href={DESK_SETTINGS.href}
        aria-label={DESK_SETTINGS.label}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-body transition-colors hover:bg-bg-brand-subtle hover:text-text-brand"
      >
        <Settings size={20} aria-hidden />
      </Link>
    </header>
  );
};

export default DeskTopBar;
