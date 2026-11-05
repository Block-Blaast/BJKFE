import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SkeletonPage } from '@/components/ui/feedback/Skeleton';
import SettingsView from '@/components/desk/settings/SettingsView';

export const metadata: Metadata = { title: '직원·설정' };

// 직원·설정 (W-10). TODO(auth): 사장님만 들어올 수 있게 막는다 (F-AUTH-03).
const SettingsPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-heading">직원·설정</h1>
        <p className="text-body-md text-text-secondary">사장님만 바꿀 수 있어요.</p>
      </header>
      {/* useSearchParams 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents) */}
      <Suspense fallback={<SkeletonPage label="화면을 불러오는 중" />}>
        <SettingsView />
      </Suspense>
    </div>
  );
};

export default SettingsPage;
