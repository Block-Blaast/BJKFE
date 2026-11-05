'use client';

import { useReviews } from '@/hooks/review/useReviews';

// 결정 대기 건수 — 검토함 화면과 같은 쿼리라 결정하면 바로 줄어든다
const PendingReviewBadge = () => {
  const { data } = useReviews({ status: 'pending' });
  if (!data?.length) return null;
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-brand px-1 text-label-sm text-text-on-brand tabular-nums">
      <span className="sr-only">결정 대기 </span>
      {data.length}
    </span>
  );
};

export default PendingReviewBadge;
