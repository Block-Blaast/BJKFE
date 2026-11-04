// 쿼리 키 팩토리. 훅에서 문자열 배열을 직접 쓰지 말고 여기에 도메인별로 추가한다.
// 무효화는 도메인의 `all`로 하면 접두사가 같은 목록·상세가 함께 갱신된다.
// SSE 이벤트(review.created, review.decided …)도 이 키로 무효화한다.

const reviewsAll = ['reviews'] as const;

export const queryKeys = {
  reviews: {
    all: reviewsAll,
    detail: (id: string) => [...reviewsAll, 'detail', id] as const,
  },
} as const;
