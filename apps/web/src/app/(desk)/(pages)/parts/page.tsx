import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SkeletonPage } from '@/components/ui/feedback/Skeleton';
import PartBrowser from '@/components/desk/PartBrowser';

export const metadata: Metadata = { title: '부품' };

const PartsPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-heading">부품</h1>
        <p className="text-body-md text-text-secondary">
          재고는 원장 합계이고, 지표는 새벽 배치가 계산한 값이에요.
        </p>
      </header>
      {/* useSearchParams 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents) */}
      <Suspense fallback={<SkeletonPage label="화면을 불러오는 중" />}>
        <PartBrowser />
      </Suspense>
    </div>
  );
};

export default PartsPage;
