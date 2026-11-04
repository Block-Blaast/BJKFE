'use client';

import { usePathname } from 'next/navigation';

import MobileTabList from './MobileTabList';

// usePathname 은 요청 시점 값이라 반드시 <Suspense> 안에서 렌더링한다 (MobileTabBar 참고).
const MobileTabs = () => {
  const pathname = usePathname();
  return <MobileTabList pathname={pathname} />;
};

export default MobileTabs;
