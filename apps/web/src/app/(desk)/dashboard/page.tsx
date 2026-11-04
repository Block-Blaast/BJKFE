import type { Metadata } from 'next';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '대시보드' };

const ELEMENTS = [
  '결품 위험 상위 5 (P_out × L)',
  '검토 대기',
  '의심 항목',
  '묶인 재고 금액',
  '외부 요인 현황 (해상운임·명절·환율)',
  '오늘 활동',
];

const DashboardPage = () => {
  return (
    <PagePlaceholder
      specId="W-01"
      title="대시보드"
      description="공장 재고와 발주 상황을 한눈에 봐요. 실시간 갱신(SSE)."
      elements={ELEMENTS}
    />
  );
};

export default DashboardPage;
