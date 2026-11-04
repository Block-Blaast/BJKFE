import type { Metadata } from 'next';
import { Suspense } from 'react';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '의견서·승인' };

const ELEMENTS = [
  '판정 배지(보류·수정 권고·적정) + 긴급·주의 표시',
  '의견서 (판정 → 요약 → 체크별 근거 → 수정안·금액 → 미발주 리스크 → 계산 기준 시각)',
  '원안 vs 수정안 비교 (수량·공급사·단가·총액·절감액)',
  '승인 버튼: 수정안 승인 / 원안 승인 / 직접 수정 후 승인 / 발주 불필요 수용 / 반려 (F-APPROVAL-01)',
  'Idempotency-Key, 동시 승인 409 처리',
  '질문하기 (F-REVIEW-09)',
];

// params 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents).
const TargetId = async ({ params }: { params: PageProps<'/m/reviews/[id]'>['params'] }) => {
  const { id } = await params;
  return <span className="text-label-md text-text-body">대상 ID: {id}</span>;
};

const MobileReviewPage = ({ params }: PageProps<'/m/reviews/[id]'>) => {
  return (
    <PagePlaceholder
      specId="M-05"
      title="의견서·승인"
      description="판정과 의견서를 보고 버튼 하나로 결정해요."
      elements={ELEMENTS}
    >
      <Suspense fallback={null}>
        <TargetId params={params} />
      </Suspense>
    </PagePlaceholder>
  );
};

export default MobileReviewPage;
