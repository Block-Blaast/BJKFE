import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SkeletonPage } from '@/components/ui/feedback/Skeleton';
import ReviewInbox from '@/components/desk/ReviewInbox';

export const metadata: Metadata = { title: '검토함' };

const ReviewsPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-heading">검토함</h1>
        <p className="text-body-md text-text-secondary">
          발주 요청과 시스템 초안의 검토 결과예요. 긴급한 건이 맨 위에 와요.
        </p>
      </header>
      {/* useSearchParams 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents) */}
      <Suspense fallback={<SkeletonPage label="화면을 불러오는 중" />}>
        <ReviewInbox />
      </Suspense>
    </div>
  );
};

export default ReviewsPage;
