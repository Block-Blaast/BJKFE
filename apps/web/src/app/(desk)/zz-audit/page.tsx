// 임시 미리보기 — 확인 후 삭제
import { Suspense } from 'react';
import X from '@/components/desk/AuditBoard';
import Seeded from '@/app/zz-preview/Seeded';
const PreviewPage = () => (
  <Seeded>
    <Suspense fallback={null}>
      <X />
    </Suspense>
  </Seeded>
);
export default PreviewPage;
