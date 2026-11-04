import type { Metadata } from 'next';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '아침 브리핑' };

const ELEMENTS = [
  '놓친 발주 N건 (예상 손실 합계)',
  '검토 대기 N건',
  '실사 필요 N건',
  '예상 손실 순 정렬, 항목 → 의견서·승인(M-05)',
  "세 가지 모두 0이면 '오늘 할 일이 없어요'",
];

const BriefingPage = () => {
  return (
    <PagePlaceholder
      specId="M-04"
      title="아침 브리핑"
      description="사장님이 아침에 확인할 일을 예상 손실 순으로 봐요."
      elements={ELEMENTS}
    />
  );
};

export default BriefingPage;
