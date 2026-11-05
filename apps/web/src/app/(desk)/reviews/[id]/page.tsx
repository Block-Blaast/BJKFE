import type { Metadata } from 'next';
import { Suspense } from 'react';

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
    <Suspense fallback={null}>
      <ReviewBody params={params} />
    </Suspense>
  );
};

export default ReviewDetailPage;
