// 화면 경로와 명세서 화면 ID(15장)의 대응. 메뉴·탭·링크는 이 상수만 쓴다.

export const MOBILE_TABS = [
  { href: '/m/chat', label: '채팅', specId: 'M-02' },
  { href: '/m/requests', label: '내 요청', specId: 'M-03' },
  { href: '/m/briefing', label: '브리핑', specId: 'M-04' },
] as const;

// PC 주 메뉴 (v2) — 화면 묶음이 아니라 발주 흐름 5단계가 곧 메뉴다. 대시보드(오늘)는 로고가 입구다.
// match 의 경로 중 하나에 있으면 그 단계가 활성이다. ②자동 검토와 ③사장님 결정은 같은 /reviews 라
// status 로 가른다(?status=all 이면 ②, 아니면 ③ — reviewFilters 의 기본값이 결정 대기다).
// 하위 화면은 DESK_SUB_NAV 의 탭으로 고른다.
export const DESK_FLOW = [
  {
    key: 'record',
    label: '현장 기록',
    who: '작업자 · 채팅',
    href: '/warehouse',
    match: ['/warehouse', '/parts', '/hidden-stock'],
    status: null,
  },
  {
    key: 'review',
    label: '자동 검토',
    who: '시스템 · 체크 9가지',
    href: '/reviews?status=all',
    match: ['/reviews'],
    status: 'all',
  },
  {
    key: 'decide',
    label: '사장님 결정',
    who: '검토함 · 결정 대기',
    href: '/reviews',
    match: ['/reviews'],
    status: 'pending',
  },
  {
    key: 'ordered',
    label: '발주·납기',
    who: '공급사 · 도착 대기',
    href: '/reports',
    match: ['/reports'],
    status: null,
  },
  {
    key: 'received',
    label: '입고 검수',
    who: '작업자 · 수량 확인',
    href: '/audit',
    match: ['/audit'],
    status: null,
  },
] as const;

// 오른쪽 톱니 — 처음 한 번 맞춰 두는 화면들
export const DESK_SETTINGS = {
  href: '/setup',
  label: '설정',
  match: ['/setup', '/settings'],
} as const;

export const DESK_SUB_NAV = [
  {
    match: DESK_FLOW[0].match,
    items: [
      { href: '/warehouse', label: '3D 창고', specId: null },
      { href: '/parts', label: '부품', specId: 'W-04' },
      { href: '/hidden-stock', label: '숨은 재고', specId: 'W-07' },
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
export type DeskFlowKey = (typeof DESK_FLOW)[number]['key'];
