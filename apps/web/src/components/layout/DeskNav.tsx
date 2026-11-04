'use client';

import { usePathname } from 'next/navigation';

import DeskNavList from './DeskNavList';

// usePathname 은 요청 시점 값이라 반드시 <Suspense> 안에서 렌더링한다 (DeskSidebar 참고).
const DeskNav = () => {
  const pathname = usePathname();
  return <DeskNavList pathname={pathname} />;
};

export default DeskNav;
