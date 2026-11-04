import type { Metadata } from 'next';
import { Suspense } from 'react';

import ReportsView from '@/components/desk/reports/ReportsView';

export const metadata: Metadata = { title: '리포트' };

// 리포트 (W-09)
const ReportsPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-heading">리포트</h1>
        <p className="text-body-md text-text-secondary">
          승인된 발주의 결재용 PDF와 발주 문구, 검토 기준값 검증 결과를 봐요.
        </p>
      </header>
      {/* useSearchParams 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents) */}
      <Suspense fallback={<p className="text-body-md text-text-secondary">불러오는 중이에요…</p>}>
        <ReportsView />
      </Suspense>
    </div>
  );
};

export default ReportsPage;
