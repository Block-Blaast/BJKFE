import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { auditQueries, dismissMerge, mergeParts } from '@bjk/api/audits';
import { queryKeys } from '@bjk/api/queryKeys';

export const useMergeCandidates = () => useQuery(auditQueries.mergeCandidates());

const useInvalidateAfterMerge = () => {
  const queryClient = useQueryClient();
  // 병합하면 재고(S)·숨은 재고(H)가 바뀌어 부품 화면과 검토 근거(C-04)도 달라진다
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.mergeCandidates.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.parts.all }),
    ]);
};

export const useMergeParts = () => {
  const invalidate = useInvalidateAfterMerge();
  return useMutation({
    mutationFn: ({ id, primaryPartId }: { id: string; primaryPartId: string }) =>
      mergeParts(id, { primary_part_id: primaryPartId }),
    onSettled: invalidate,
  });
};

export const useDismissMerge = () => {
  const invalidate = useInvalidateAfterMerge();
  return useMutation({ mutationFn: dismissMerge, onSettled: invalidate });
};
