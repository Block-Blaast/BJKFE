// 임시 미리보기 — 확인 후 삭제
import { Suspense } from 'react';
import X from '@/components/review/ReviewDetail';
import Seeded from '@/app/zz-preview/Seeded';
const PreviewPage = () => (
  <Seeded>
    <Suspense fallback={null}>
      <div className="px-4 pt-4">
        <X id="rv-bearing-6205zz" layout="mobile" />
      </div>
    </Suspense>
  </Seeded>
);
export default PreviewPage;
