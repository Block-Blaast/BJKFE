// 알약 컨트롤 클래스 — 필터 선택, 한 줄 검색 (design-system.md: 폼 입력은 rounded-md, 필터·검색은 rounded-full)
export const PILL_SELECT =
  'h-11 cursor-pointer rounded-full border border-border-default bg-bg-surface px-4 text-body-sm text-text-body shadow-card outline-none focus:border-border-brand';

export const PILL_SEARCH =
  'h-11 rounded-full border border-border-default bg-bg-surface px-5 text-body-sm text-text-body shadow-card outline-none placeholder:text-text-placeholder focus:border-border-brand';

// Input 컴포넌트와 같은 높이·모양의 맨 입력칸·선택 (라벨 없이 한 줄에 여러 칸 놓을 때, 표 안)
export const FIELD =
  'h-12 rounded-md border border-border-strong bg-bg-surface px-4 text-body-md text-text-body outline-none placeholder:text-text-placeholder focus:border-border-brand disabled:bg-bg-subtle disabled:text-text-disabled';
