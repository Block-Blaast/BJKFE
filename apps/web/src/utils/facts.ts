import { CHECK_FACT_LABELS, type CheckCode, FACTS, FACT_TEXT } from '@bjk/api/domain/review';

import { formatDate, formatNumber, formatQty, formatWon } from './format';

// 근거 기호(Q, S, D95, LT90 …)의 뜻과 값 표시 (F-REVIEW-02). 검토 근거 표와 부품 지표가 함께 쓴다.
// code 를 주면 그 체크에서만 쓰는 이름(CHECK_FACT_LABELS)을 먼저 쓴다
export const factLabel = (key: string, code?: CheckCode) =>
  (code && CHECK_FACT_LABELS[code]?.[key]) ?? FACTS[key]?.label ?? key;

export const formatFact = (key: string, value: number | string | null, unit: string) => {
  if (value === null) return '—';
  const kind = FACTS[key]?.kind ?? (typeof value === 'number' ? 'number' : 'text');
  if (typeof value === 'string') {
    if (kind === 'date') return formatDate(value);
    return value
      .split(',')
      .map((v) => FACT_TEXT[v] ?? v)
      .join(', ');
  }
  switch (kind) {
    case 'qty':
      return formatQty(value, unit);
    case 'won':
      return formatWon(value);
    case 'days':
      return `${formatNumber(value)}일`;
    case 'months':
      return `${formatNumber(value)}개월`;
    default:
      return formatNumber(value);
  }
};
