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

const analyzedAtFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: KST,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

// 예: "2026. 11. 05. 03:00" — 해를 넘기는 날짜(소진일 등)와 함께 볼 때 쓴다
export const formatAnalyzedAt = (iso: string) => analyzedAtFormat.format(new Date(iso));

// ISO 시각 → KST 날짜 'YYYY-MM-DD'. 서버 시각은 +09:00 과 Z(UTC)가 섞여 와서 앞 10자리를 자르면 날짜가 어긋난다.
const kstDayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: KST });
export const kstDay = (iso: string) => kstDayFormat.format(new Date(iso));

// 'YYYY-MM-DD' (서버 날짜) → "11월 8일"
export const formatDate = (ymd: string) => {
  const [, month, day] = ymd.split('-').map(Number);
  return `${month}월 ${day}일`;
};

// 'YYYY-MM-DD' → "2027년 5월 4일"
export const formatFullDate = (ymd: string) => {
  const [year, month, day] = ymd.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
};

// 두 'YYYY-MM-DD' 사이의 날 수 (to - from). UTC 자정으로 맞춰 서머타임·시간대 영향을 없앤다.
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
