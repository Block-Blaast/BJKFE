import { ClipboardList, MessageSquare, Sunrise, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { MOBILE_TABS, type MobileTabHref } from '@/constants/routes';

const TAB_ICON: Record<MobileTabHref, LucideIcon> = {
  '/m/chat': MessageSquare,
  '/m/requests': ClipboardList,
  '/m/briefing': Sunrise,
};

type MobileTabListProps = {
  // null 이면 현재 경로를 아직 모르는 상태(프리렌더 fallback)라 활성 표시 없이 그린다.
  pathname: string | null;
};

// 떠 있는 알약 탭 — 선택된 탭만 검정으로 채운다(PC 내비와 같은 규칙). 높이 48px 로 장갑 낀 손에도 넉넉하다.
// TODO(auth): 역할별로 탭을 거른다. 브리핑(M-04)은 사장님 전용.
const MobileTabList = ({ pathname }: MobileTabListProps) => {
  return (
    <ul className="flex gap-1 rounded-full bg-bg-surface p-1 shadow-raised">
      {MOBILE_TABS.map(({ href, label }) => {
        const active = pathname !== null && pathname.startsWith(href);
        const Icon = TAB_ICON[href];
        return (
          <li key={href} className="flex-1">
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex h-12 items-center justify-center gap-2 rounded-full text-label-md transition-colors ${active ? 'bg-bg-inverse text-text-on-inverse' : 'text-text-secondary'}`}
            >
              <Icon size={18} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default MobileTabList;
