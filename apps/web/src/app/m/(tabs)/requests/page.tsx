import type { Metadata } from 'next';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '내 요청' };

const ELEMENTS = [
  '요청 목록과 상태: 검토중 → 검토완료 → 발주됨 → 입고완료 (F-APPROVAL-02)',
  '반려·보류 사유',
  '보류 시 보완 입력',
];

const MyRequestsPage = () => {
  return (
    <PagePlaceholder
      specId="M-03"
      title="내 요청"
      description="내가 올린 발주 요청의 진행 상태를 봐요."
      elements={ELEMENTS}
    />
  );
};

export default MyRequestsPage;
