import type { Metadata } from 'next';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '부품 목록' };

const ELEMENTS = [
  '검색',
  '필터: ABC, 수요 유형, 카테고리, 위험도 (URL 쿼리스트링)',
  '현재 재고·소진 예상일에 계산 기준 시각',
];

const PartsPage = () => {
  return (
    <PagePlaceholder
      specId="W-04"
      title="부품 목록"
      description="부품을 찾고 위험한 부품을 걸러봐요. 실시간 갱신(SSE)."
      elements={ELEMENTS}
    />
  );
};

export default PartsPage;
