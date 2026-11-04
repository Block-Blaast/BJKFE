import type { Metadata } from 'next';
import { Suspense } from 'react';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '부품 상세' };

const ELEMENTS = [
  '재고 추이 + 예측선',
  '지표와 계산 근거 (D95, 재주문점, LT50·LT90, 권장 발주량)',
  '입출고 원문 (채팅 메시지)',
  '별칭 목록',
];

// params 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents).
const TargetId = async ({ params }: { params: PageProps<'/parts/[id]'>['params'] }) => {
  const { id } = await params;
  return <span className="text-label-md text-text-body">대상 ID: {id}</span>;
};

const PartDetailPage = ({ params }: PageProps<'/parts/[id]'>) => {
  return (
    <PagePlaceholder
      specId="W-05"
      title="부품 상세"
      description="부품 하나의 재고 흐름과 계산 근거를 봐요. 실시간 갱신(SSE)."
      elements={ELEMENTS}
    >
      <Suspense fallback={null}>
        <TargetId params={params} />
      </Suspense>
    </PagePlaceholder>
  );
};

export default PartDetailPage;
