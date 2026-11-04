import type { Metadata } from 'next';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '기준 정보' };

const ELEMENTS = [
  '부품 엑셀 이관 → AI 규격·카테고리 제안 검토 (확신도 낮은 줄 위로, F-SETUP-01·02)',
  '등록 시 중복 의심 쌍 병합 질문',
  '설비 (부품·수량, 시간당 손실액, 가동 시간)',
  '정비 일정',
  '공급사 (납기, 단가·MOQ·단가 구간, 휴무일)',
  '카테고리 기본값 (수입 의존, 연결 요인, F-SETUP-03)',
];

const SetupPage = () => {
  return (
    <PagePlaceholder
      specId="W-08"
      title="기준 정보"
      description="발주콕이 계산할 수 있게 공장의 기본 정보를 넣어요."
      elements={ELEMENTS}
    />
  );
};

export default SetupPage;
