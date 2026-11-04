import { ChevronLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

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
      <Link
        href="/m/briefing"
        className="-ml-2 flex h-11 w-fit items-center gap-1 px-2 text-label-md text-text-secondary"
      >
        <ChevronLeft size={20} aria-hidden />
        브리핑
      </Link>
      <Suspense fallback={null}>
        <ReviewBody params={params} />
      </Suspense>
    </main>
  );
};

export default MobileReviewPage;
