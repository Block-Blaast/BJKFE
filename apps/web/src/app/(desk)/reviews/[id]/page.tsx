import type { Metadata } from 'next';
import { Suspense } from 'react';

import BackLink from '@/components/ui/BackLink';
import ReviewDetail from '@/components/review/ReviewDetail';

export const metadata: Metadata = { title: '검토 상세' };

// params 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents).
const ReviewBody = async ({ params }: { params: PageProps<'/reviews/[id]'>['params'] }) => {
  const { id } = await params;
  return <ReviewDetail id={id} layout="desk" />;
};

// TODO(W-03): PDF 링크 (F-APPROVAL-04)
const ReviewDetailPage = ({ params }: PageProps<'/reviews/[id]'>) => {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/reviews" label="검토함" />
      <Suspense fallback={null}>
        <ReviewBody params={params} />
      </Suspense>
    </div>
  );
};

export default ReviewDetailPage;
