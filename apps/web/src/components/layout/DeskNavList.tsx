import {
  ClipboardCheck,
  FileText,
  Inbox,
  LayoutDashboard,
  Layers,
  Package,
  Settings,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import { DESK_NAV, type DeskNavHref } from '@/constants/routes';

const NAV_ICON: Record<DeskNavHref, LucideIcon> = {
  '/dashboard': LayoutDashboard,
  '/reviews': Inbox,
  '/parts': Package,
  '/audit': ClipboardCheck,
  '/hidden-stock': Layers,
  '/setup': SlidersHorizontal,
  '/reports': FileText,
  '/settings': Settings,
};

type DeskNavListProps = {
  // null 이면 현재 경로를 아직 모르는 상태(프리렌더 fallback)라 활성 표시 없이 그린다.
  pathname: string | null;
};

// TODO(auth): 권한별로 메뉴를 거른다. 기준 정보·장부 검증은 관리자 이상, 직원·설정은 사장님 전용.
const DeskNavList = ({ pathname }: DeskNavListProps) => {
  return (
    <ul className="flex flex-col gap-1">
      {DESK_NAV.map(({ href, label }) => {
        const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
        const Icon = NAV_ICON[href];
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-label-md ${active ? 'bg-bg-brand-subtle text-text-brand' : 'text-text-body hover:bg-bg-subtle'}`}
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

export default DeskNavList;
