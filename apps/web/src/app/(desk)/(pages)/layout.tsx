import { ViewTransition, type ReactNode } from 'react';

import BackLink from '@/components/ui/BackLink';
import { DESK_HOME } from '@/constants/routes';

// 3D 창고 메뉴에서 여는 기존 화면들(W-01~10). 상단 메뉴 대신 3D 창고로 돌아가는 줄 하나만 둔다.
// 회색 바탕 → 옅은 패널 → 흰 카드 3겹으로 카드가 떠 보이게 한다 (design-system.md "화면 인상").
// 화면 전환: 이 레이아웃은 3D 창고와 오갈 때만 새로 붙고 떨어진다 → enter/exit 가 "패널이 떠오름/가라앉음"이다.
// 그룹 안 화면끼리(목록 ↔ 상세)는 레이아웃이 남아 있어 본문만 update 로 좌우로 미끄러진다. 뒤로 가기 줄은 움직이지 않는다.
const DeskPagesLayout = ({ children }: { children: ReactNode }) => {
  return (
    <ViewTransition enter="desk-panel-in" exit="desk-panel-out" default="none">
      <div className="m-5 flex flex-1 flex-col gap-6 rounded-xl bg-bg-page p-6">
        <BackLink href={DESK_HOME.href} label={`${DESK_HOME.label}로`} />
        <ViewTransition
          update={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
          default="none"
        >
          <main className="flex flex-1 flex-col">{children}</main>
        </ViewTransition>
      </div>
    </ViewTransition>
  );
};

export default DeskPagesLayout;
