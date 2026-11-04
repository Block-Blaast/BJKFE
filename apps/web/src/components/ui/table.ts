// 표 스타일 (2026-11-05 — 참고: Loseva 타임시트 표). 줄 사이 선 없이
// 둥근 회색 머리줄 + 흰색·연회색이 번갈아 가는 줄무늬로 행을 나눈다. 모든 표가 이 클래스만 쓴다.

// 표만 있는 화면(검토함, 부품 목록 …)에서 표를 담는 흰 카드
export const TABLE_CARD = 'rounded-xl bg-bg-surface p-4 shadow-card';

export const TABLE = 'w-full text-body-sm';

// 머리줄 칸 — 양 끝 칸만 모서리를 둥글려 한 줄짜리 회색 띠로 보이게 한다
export const TH =
  'bg-bg-subtle px-4 py-3 text-label-sm font-medium text-text-secondary first:rounded-l-md last:rounded-r-md';

// 본문 줄 — 짝수 줄만 연회색. 흰 카드 위에서 줄무늬가 된다
export const TR = 'even:bg-bg-page hover:bg-bg-subtle';

export const TD = 'px-4 py-3 first:rounded-l-md last:rounded-r-md';
