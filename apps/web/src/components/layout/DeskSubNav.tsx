'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { DESK_SUB_NAV, isUnder } from '@/constants/routes';

// 묶인 메뉴(창고·설정) 안의 하위 탭. usePathname 을 쓰므로 <Suspense> 안에서 렌더링한다.
const DeskSubNav = () => {
  const pathname = usePathname();
  const group = DESK_SUB_NAV.find((g) => g.match.some((m) => isUnder(pathname, m)));
  if (!group) return null;

  return (
    <nav aria-label="하위 메뉴">
      <ul className="flex items-center gap-2">
        {group.items.map(({ href, label }) => {
          const active = isUnder(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-9 items-center rounded-full px-4 text-label-sm whitespace-nowrap transition-colors ${active ? 'bg-bg-surface text-text-heading shadow-card' : 'text-text-secondary hover:bg-bg-surface hover:text-text-body'}`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default DeskSubNav;
