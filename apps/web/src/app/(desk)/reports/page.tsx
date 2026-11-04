import type { Metadata } from 'next';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '리포트' };

const ELEMENTS = ['발주 PDF 목록 (F-APPROVAL-04)', '검증 리포트 (F-SIM)'];

const ReportsPage = () => {
  return (
    <PagePlaceholder
      specId="W-09"
      title="리포트"
      description="승인된 발주의 PDF 와 검증 리포트를 봐요."
      elements={ELEMENTS}
    />
  );
};

export default ReportsPage;
