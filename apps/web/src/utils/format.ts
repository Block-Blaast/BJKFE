// 화면 규칙(명세서 15장): 금액은 원, 수량은 부품 기본 단위, 숫자 옆에 계산 기준 시각.
// 서버 시각은 KST 기준으로 보여준다. 사용자 기기 시간대와 무관하게 공장 시간으로 맞춘다.

const KST = 'Asia/Seoul';

const numberFormat = new Intl.NumberFormat('ko-KR');

export const formatNumber = (value: number) => numberFormat.format(value);

export const formatWon = (value: number) => `${numberFormat.format(Math.round(value))}원`;

export const formatQty = (value: number, unit: string) => `${numberFormat.format(value)}${unit}`;

const computedAtFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: KST,
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

// 예: "11. 5. 03:00"
export const formatComputedAt = (iso: string) => computedAtFormat.format(new Date(iso));

// 'YYYY-MM-DD' (서버 날짜) → "11월 8일"
export const formatDate = (ymd: string) => {
  const [, month, day] = ymd.split('-').map(Number);
  return `${month}월 ${day}일`;
};
