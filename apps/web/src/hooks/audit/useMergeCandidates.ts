import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { auditQueries, decideMerge } from '@bjk/api/audits';
import { queryKeys } from '@bjk/api/queryKeys';
import type { MergeDecisionInput } from '@bjk/api/types/audit';

export const useMergeCandidates = () => useQuery(auditQueries.mergeCandidates());

// 병합·다른 부품·실사 후 결정 (MAT-02) — 한 엔드포인트라 훅도 하나다
export const useDecideMerge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MergeDecisionInput }) =>
      decideMerge(id, input),
    // 병합하면 재고(S)·숨은 재고(H)가 바뀌어 부품 화면과 검토 근거(C-04)도 달라진다
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.mergeCandidates.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.parts.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.twin.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]),
  });
};
