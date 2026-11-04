import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { Review, ReviewDecisionInput, ReviewListFilters } from './types/review';

const toSearch = ({ status, verdict, urgent, minTotal }: ReviewListFilters) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (verdict) params.set('verdict', verdict);
  if (urgent) params.set('urgent', '1');
  if (minTotal) params.set('min_total', String(minTotal));
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const getReviews = (filters: ReviewListFilters) =>
  request<Review[]>(`${ENDPOINTS.reviews}${toSearch(filters)}`);

export const getMyRequests = () => request<Review[]>(ENDPOINTS.myRequests);

export const getReview = (id: string) => request<Review>(ENDPOINTS.review(id));

// 같은 스냅샷에 같은 행동이면 같은 키 — 두 번 눌러도, 재시도해도 서버가 한 번만 처리한다 (F-APPROVAL-02).
export const reviewDecisionKey = (
  review: Pick<Review, 'id' | 'snapshot_id'>,
  input: ReviewDecisionInput,
) => `${review.id}:${review.snapshot_id}:${input.action}`;

export const decideReview = (
  review: Pick<Review, 'id' | 'snapshot_id'>,
  input: ReviewDecisionInput,
) =>
  request<Review>(ENDPOINTS.reviewDecision(review.id), {
    method: 'POST',
    headers: { 'Idempotency-Key': reviewDecisionKey(review, input) },
    body: JSON.stringify(input),
  });

export const reviewQueries = {
  list: (filters: ReviewListFilters) =>
    queryOptions({
      queryKey: queryKeys.reviews.list(filters),
      queryFn: () => getReviews(filters),
    }),
  mine: () =>
    queryOptions({
      queryKey: queryKeys.reviews.mine(),
      queryFn: getMyRequests,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.reviews.detail(id),
      queryFn: () => getReview(id),
    }),
};
