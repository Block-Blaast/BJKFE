import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { auditQueries, requestAudit } from '@bjk/api/audits';
import { queryKeys } from '@bjk/api/queryKeys';
import type { AuditListFilters } from '@bjk/api/types/audit';

export const useAudits = (filters: AuditListFilters) => useQuery(auditQueries.list(filters));

export const useCompanyStaff = () => useQuery(auditQueries.members());

export const useRequestAudit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string }) =>
      requestAudit(id, { assignee_id: assigneeId }),
    // 브리핑의 '실사 필요'도 같은 항목이라 함께 갱신한다
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.audits.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.briefing.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
      ]),
  });
};
