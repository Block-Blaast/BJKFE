// 쿼리 키 팩토리. 훅에서 문자열 배열을 직접 쓰지 말고 여기에 도메인별로 추가한다.
// 무효화는 도메인의 `all`로 하면 접두사가 같은 목록·상세가 함께 갱신된다.
// SSE 이벤트(review.created, review.decided …)도 이 키로 무효화한다.
import type { ReviewListFilters } from './types/review';

const reviewsAll = ['reviews'] as const;
const briefingAll = ['briefing'] as const;

export const queryKeys = {
  reviews: {
    all: reviewsAll,
    list: (filters: ReviewListFilters) => [...reviewsAll, 'list', filters] as const,
    mine: () => [...reviewsAll, 'mine'] as const,
    detail: (id: string) => [...reviewsAll, 'detail', id] as const,
  },
  // 브리핑은 검토·장부 검증 결과를 모은 것이라, 검토가 결정되면 함께 무효화한다.
  briefing: {
    all: briefingAll,
  },
} as const;
