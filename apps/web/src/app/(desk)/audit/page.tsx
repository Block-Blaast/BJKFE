import type { Metadata } from 'next';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '장부 검증' };

const ELEMENTS = [
  '의심 항목과 사유, 등급순 (높음 → 중간 → 낮음, F-AUDIT-01~05)',
  '[실사 요청] → 담당 작업자 채팅 (F-AUDIT-06)',
  '처리 결과 (차이·사유, 이상 없음)',
];

const AuditPage = () => {
  return (
    <PagePlaceholder
      specId="W-06"
      title="장부 검증"
      description="장부와 실물이 다를 것 같은 부품을 찾아 실사로 바로잡아요. 실시간 갱신(SSE)."
      elements={ELEMENTS}
    />
  );
};

export default AuditPage;
