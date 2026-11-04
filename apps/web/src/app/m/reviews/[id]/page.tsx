import type { Metadata } from 'next';
import { Suspense } from 'react';

import BackLink from '@/components/ui/BackLink';
import ReviewDetail from '@/components/review/ReviewDetail';

export const metadata: Metadata = { title: '의견서·승인' };

// params 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents).
const ReviewBody = async ({ params }: { params: PageProps<'/m/reviews/[id]'>['params'] }) => {
  const { id } = await params;
  return <ReviewDetail id={id} layout="mobile" />;
};

const MobileReviewPage = ({ params }: PageProps<'/m/reviews/[id]'>) => {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-4">
      <BackLink href="/m/briefing" label="브리핑" />
      <Suspense fallback={null}>
        <ReviewBody params={params} />
      </Suspense>
    </main>
  );
};

export default MobileReviewPage;
