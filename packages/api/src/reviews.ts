import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { Review, ReviewDecisionInput } from './types/review';

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
  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.reviews.detail(id),
      queryFn: () => getReview(id),
    }),
};
