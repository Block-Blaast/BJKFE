// 임시 미리보기 — 확인 후 삭제
import { Suspense } from 'react';
import X from '@/components/desk/PartDetail';
import Seeded from '@/app/zz-preview/Seeded';
const PreviewPage = () => (
  <Seeded>
    <Suspense fallback={null}>
      <X id="pt-bearing-6205zz" />
    </Suspense>
  </Seeded>
);
export default PreviewPage;
