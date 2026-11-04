// 화면 경로와 명세서 화면 ID(15장)의 대응. 메뉴·탭·링크는 이 상수만 쓴다.

export const MOBILE_TABS = [
  { href: '/m/chat', label: '채팅', specId: 'M-02' },
  { href: '/m/requests', label: '내 요청', specId: 'M-03' },
  { href: '/m/briefing', label: '브리핑', specId: 'M-04' },
] as const;

export const DESK_NAV = [
  { href: '/dashboard', label: '대시보드', specId: 'W-01' },
  { href: '/reviews', label: '검토함', specId: 'W-02' },
  { href: '/parts', label: '부품', specId: 'W-04' },
  { href: '/audit', label: '장부 검증', specId: 'W-06' },
  { href: '/hidden-stock', label: '숨은 재고', specId: 'W-07' },
  { href: '/setup', label: '기준 정보', specId: 'W-08' },
  { href: '/reports', label: '리포트', specId: 'W-09' },
  { href: '/settings', label: '직원·설정', specId: 'W-10' },
] as const;

export type MobileTabHref = (typeof MOBILE_TABS)[number]['href'];
export type DeskNavHref = (typeof DESK_NAV)[number]['href'];
