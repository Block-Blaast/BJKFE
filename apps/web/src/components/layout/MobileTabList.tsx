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

// TODO(auth): 역할별로 탭을 거른다. 브리핑(M-04)은 사장님 전용.
const MobileTabList = ({ pathname }: MobileTabListProps) => {
  return (
    <ul className="flex">
      {MOBILE_TABS.map(({ href, label }) => {
        const active = pathname !== null && pathname.startsWith(href);
        const Icon = TAB_ICON[href];
        return (
          <li key={href} className="flex-1">
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex h-14 flex-col items-center justify-center gap-1 text-label-sm ${active ? 'text-text-brand' : 'text-text-secondary'}`}
            >
              <Icon size={20} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default MobileTabList;
