import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SkeletonPage } from '@/components/ui/feedback/Skeleton';
import HiddenStockList from '@/components/desk/HiddenStockList';

export const metadata: Metadata = { title: '숨은 재고' };

const HiddenStockPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-heading">숨은 재고</h1>
        <p className="text-body-md text-text-secondary">
          규격은 같은데 이름이 달라 따로 등록된 부품이에요. 합치면 &quot;있는데 또 사는&quot; 발주를
          막을 수 있어요.
        </p>
      </header>
      {/* useSearchParams 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents) */}
      <Suspense fallback={<SkeletonPage label="화면을 불러오는 중" />}>
        <HiddenStockList />
      </Suspense>
    </div>
  );
};

export default HiddenStockPage;
