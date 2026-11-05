// 화면 경로와 명세서 화면 ID(15장)의 대응. 메뉴·탭·링크는 이 상수만 쓴다.

export const MOBILE_TABS = [
  { href: '/m/chat', label: '채팅', specId: 'M-02' },
  { href: '/m/requests', label: '내 요청', specId: 'M-03' },
  { href: '/m/briefing', label: '브리핑', specId: 'M-04' },
] as const;

// PC 주 메뉴 (v2) — 화면 번호 순이 아니라 사장님의 일 순서(오늘 → 검토 → 창고 → 리포트)로 묶는다.
// match 의 경로 중 하나에 있으면 그 메뉴가 활성이다. 하위 화면은 DESK_SUB_NAV 의 탭으로 고른다.
export const DESK_NAV = [
  { href: '/dashboard', label: '오늘', specId: 'W-01', match: ['/dashboard'] },
  { href: '/reviews', label: '검토함', specId: 'W-02', match: ['/reviews'] },
  {
    href: '/warehouse',
    label: '창고',
    specId: 'W-04',
    match: ['/warehouse', '/parts', '/hidden-stock', '/audit'],
  },
  { href: '/reports', label: '리포트', specId: 'W-09', match: ['/reports'] },
] as const;

// 오른쪽 톱니 — 처음 한 번 맞춰 두는 화면들
export const DESK_SETTINGS = {
  href: '/setup',
  label: '설정',
  match: ['/setup', '/settings'],
} as const;

export const DESK_SUB_NAV = [
  {
    match: DESK_NAV[2].match,
    items: [
      { href: '/warehouse', label: '3D 창고', specId: null },
      { href: '/parts', label: '부품', specId: 'W-04' },
      { href: '/hidden-stock', label: '숨은 재고', specId: 'W-07' },
      { href: '/audit', label: '장부 검증', specId: 'W-06' },
    ],
  },
  {
    match: DESK_SETTINGS.match,
    items: [
      { href: '/setup', label: '기준 정보', specId: 'W-08' },
      { href: '/settings', label: '직원·설정', specId: 'W-10' },
    ],
  },
] as const;

export const isUnder = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export type MobileTabHref = (typeof MOBILE_TABS)[number]['href'];
export type DeskNavHref = (typeof DESK_NAV)[number]['href'];
