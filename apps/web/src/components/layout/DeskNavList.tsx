import Link from 'next/link';

import { DESK_NAV, isUnder } from '@/constants/routes';

import PendingReviewBadge from './PendingReviewBadge';

type DeskNavListProps = {
  // null 이면 현재 경로를 아직 모르는 상태(프리렌더 fallback)라 활성 표시 없이 그린다.
  pathname: string | null;
};

// 상단 알약 내비 (v2: 오늘 → 검토함 → 창고 → 리포트). 선택된 항목만 검정 알약 — 파랑은 강조 카드·버튼에 아껴 쓴다.
// TODO(auth): 권한별로 메뉴를 거른다. 기준 정보·장부 검증은 관리자 이상, 직원·설정은 사장님 전용.
const DeskNavList = ({ pathname }: DeskNavListProps) => {
  return (
    <ul className="flex items-center gap-1 rounded-full bg-bg-page p-1">
      {DESK_NAV.map(({ href, label, match }) => {
        const active = pathname !== null && match.some((m) => isUnder(pathname, m));
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex h-10 items-center gap-2 rounded-full px-5 text-label-md whitespace-nowrap transition-colors ${active ? 'bg-bg-inverse text-text-on-inverse' : 'text-text-body hover:bg-bg-surface'}`}
            >
              {label}
              {href === '/reviews' ? <PendingReviewBadge /> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default DeskNavList;
