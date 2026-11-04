import type { Metadata } from 'next';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '검토함' };

const ELEMENTS = [
  '판정·긴급·금액 필터 (URL 쿼리스트링)',
  '긴급 건 최상단',
  '목록 → 검토 상세(W-03)',
];

const ReviewsPage = () => {
  return (
    <PagePlaceholder
      specId="W-02"
      title="검토함"
      description="발주 검토 목록이에요. 실시간 갱신(SSE)."
      elements={ELEMENTS}
    />
  );
};

export default ReviewsPage;
