import type { Metadata } from 'next';
import { Suspense } from 'react';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '검토 상세' };

const ELEMENTS = [
  '의견서',
  '체크별 근거 표 (C-01~C-09, 긴급 → 경고 → 정보)',
  '재고 예측 그래프 (발주 시 / 미발주 시)',
  '승인 버튼 (M-05 와 동일)',
  'PDF (F-APPROVAL-04)',
];

// params 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents).
const TargetId = async ({ params }: { params: PageProps<'/reviews/[id]'>['params'] }) => {
  const { id } = await params;
  return <span className="text-label-md text-text-body">대상 ID: {id}</span>;
};

const ReviewDetailPage = ({ params }: PageProps<'/reviews/[id]'>) => {
  return (
    <PagePlaceholder
      specId="W-03"
      title="검토 상세"
      description="의견서와 근거를 자세히 보고 승인해요. 실시간 갱신(SSE)."
      elements={ELEMENTS}
    >
      <Suspense fallback={null}>
        <TargetId params={params} />
      </Suspense>
    </PagePlaceholder>
  );
};

export default ReviewDetailPage;
