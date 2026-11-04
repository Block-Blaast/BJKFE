import type { Metadata } from 'next';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '숨은 재고' };

const ELEMENTS = [
  '중복 의심 쌍 목록',
  '규격·재고 비교',
  '[병합] (대표 부품 선택) / [다른 부품] (F-MATCH-03)',
];

const HiddenStockPage = () => {
  return (
    <PagePlaceholder
      specId="W-07"
      title="숨은 재고"
      description="이름만 다르게 등록된 같은 부품을 찾아 합쳐요."
      elements={ELEMENTS}
    />
  );
};

export default HiddenStockPage;
