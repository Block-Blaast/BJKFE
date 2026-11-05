// 화면 경로와 명세서 화면 ID(15장)의 대응. 메뉴·탭·링크는 이 상수만 쓴다.

export const MOBILE_TABS = [
  { href: '/m/chat', label: '채팅', specId: 'M-02' },
  { href: '/m/requests', label: '내 요청', specId: 'M-03' },
  { href: '/m/briefing', label: '브리핑', specId: 'M-04' },
] as const;

// PC (v3) — 상단 메뉴가 없다. 3D 창고(/warehouse)가 유일한 입구이고(proxy.ts 가 / 를 보낸다),
// 기존 화면은 3D 창고 왼쪽 위 메뉴(WarehouseMenu)에서 상세 페이지로 연다. 각 화면은 DESK_HOME 으로 돌아온다.
export const DESK_HOME = { href: '/warehouse', label: '3D 창고' } as const;

export const DESK_MENU = [
  {
    title: '현황',
    items: [
      { href: '/reviews', label: '검토함', specId: 'W-02' },
      { href: '/reports', label: '발주·리포트', specId: 'W-09' },
    ],
  },
  {
    title: '재고',
    items: [
      { href: '/parts', label: '부품', specId: 'W-04' },
      { href: '/hidden-stock', label: '숨은 재고', specId: 'W-07' },
      { href: '/audit', label: '입고 검수·실사', specId: 'W-06' },
    ],
  },
  {
    title: '설정',
    items: [
      { href: '/setup', label: '기준 정보', specId: 'W-08' },
      { href: '/settings', label: '직원·설정', specId: 'W-10' },
    ],
  },
] as const;

export const isUnder = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export type MobileTabHref = (typeof MOBILE_TABS)[number]['href'];
