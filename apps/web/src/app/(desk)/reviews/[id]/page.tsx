import { ChevronLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
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
    <div className="flex flex-col gap-6">
      <Link
        href="/reviews"
        className="flex w-fit items-center gap-1 text-label-md text-text-secondary hover:text-text-heading"
      >
        <ChevronLeft size={18} aria-hidden />
        검토함
      </Link>
      <Suspense fallback={null}>
        <ReviewBody params={params} />
      </Suspense>
    </div>
  );
};

export default ReviewDetailPage;
