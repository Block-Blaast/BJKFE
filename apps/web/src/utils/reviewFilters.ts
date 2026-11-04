import { VERDICTS, type Verdict } from '@bjk/api/domain/review';
import type { ReviewListFilters } from '@bjk/api/types/review';

// 검토함(W-02) 필터 ↔ URL 쿼리스트링. 새로고침·뒤로 가기·링크 공유에도 필터가 유지된다 (desk.md).

// 임시 — 명세서는 "금액 필터"만 정하고 구간은 정하지 않았다. 실제 발주 금액 분포를 보고 조정한다.
export const MIN_TOTAL_OPTIONS = [
  { value: 0, label: '전체 금액' },
  { value: 100_000, label: '10만 원 이상' },
  { value: 500_000, label: '50만 원 이상' },
] as const;

const isVerdict = (value: string | null): value is Verdict =>
  value !== null && (VERDICTS as readonly string[]).includes(value);

// 판정은 고르지 않을 수 있고, 나머지는 항상 값이 있다.
export type ParsedReviewFilters = Required<Omit<ReviewListFilters, 'verdict'>> &
  Pick<ReviewListFilters, 'verdict'>;

export const parseReviewFilters = (params: URLSearchParams): ParsedReviewFilters => {
  const verdict = params.get('verdict');
  const minTotal = Number(params.get('min_total'));
  return {
    status: params.get('status') === 'all' ? 'all' : 'pending',
    verdict: isVerdict(verdict) ? verdict : undefined,
    urgent: params.get('urgent') === '1',
    minTotal: MIN_TOTAL_OPTIONS.some((o) => o.value === minTotal) ? minTotal : 0,
  };
};

export const toReviewSearch = (filters: ReviewListFilters) => {
  const params = new URLSearchParams();
  if (filters.status === 'all') params.set('status', 'all');
  if (filters.verdict) params.set('verdict', filters.verdict);
  if (filters.urgent) params.set('urgent', '1');
  if (filters.minTotal) params.set('min_total', String(filters.minTotal));
  const query = params.toString();
  return query ? `?${query}` : '';
};
