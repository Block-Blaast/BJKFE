import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@bjk/api/queryKeys';
import { decideReview } from '@bjk/api/reviews';
import type { Review, ReviewDecisionInput } from '@bjk/api/types/review';

type DecideVariables = {
  review: Pick<Review, 'id' | 'snapshot_id'>;
  input: ReviewDecisionInput;
};

// 결과 안내(성공·409)는 화면에서 한다. 훅의 onError 에 넣으면 호출부와 두 번 뜬다.
export const useDecideReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ review, input }: DecideVariables) => decideReview(review, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.reviews.detail(updated.id), updated);
    },
    // 검토함·내 요청·브리핑 숫자가 모두 바뀌고, 승인이면 발주 기록(W-09)이 생긴다
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.briefing.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
      ]),
  });
};
