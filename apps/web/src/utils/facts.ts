import { FACTS } from '@bjk/api/domain/review';

import { formatDate, formatNumber, formatQty, formatWon } from './format';

// 근거 기호(Q, S, D95, LT90 …)의 뜻과 값 표시 (F-REVIEW-02). 검토 근거 표와 부품 지표가 함께 쓴다.
export const factLabel = (key: string) => FACTS[key]?.label ?? key;

export const formatFact = (key: string, value: number | string, unit: string) => {
  const kind = FACTS[key]?.kind ?? (typeof value === 'number' ? 'number' : 'text');
  if (typeof value === 'string') return kind === 'date' ? formatDate(value) : value;
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
