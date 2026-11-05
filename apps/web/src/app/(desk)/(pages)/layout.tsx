import type { ReactNode } from 'react';

import BackLink from '@/components/ui/BackLink';
import { DESK_HOME } from '@/constants/routes';

// 3D 창고 메뉴에서 여는 기존 화면들(W-01~10). 상단 메뉴 대신 3D 창고로 돌아가는 줄 하나만 둔다.
// 회색 바탕 → 옅은 패널 → 흰 카드 3겹으로 카드가 떠 보이게 한다 (design-system.md "화면 인상").
const DeskPagesLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex flex-1 flex-col gap-6 rounded-xl bg-bg-page p-6">
      <BackLink href={DESK_HOME.href} label={`${DESK_HOME.label}로`} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
};

export default DeskPagesLayout;
