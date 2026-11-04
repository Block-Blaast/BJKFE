// 임시 미리보기 — 확인 후 삭제
import { Suspense } from 'react';
import S from '@/components/desk/settings/StaffSection';
import I from '@/components/desk/settings/InviteSection';
import F from '@/components/desk/settings/SettingsPanel';
import Seeded from '@/app/zz-preview/Seeded';
const PreviewPage = () => (
  <Seeded>
    <Suspense fallback={null}>
      <div className="grid grid-cols-2 gap-6">
        <S />
        <I />
      </div>
      <F />
    </Suspense>
  </Seeded>
);
export default PreviewPage;
