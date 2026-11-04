import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  companyQueries,
  createInvite,
  updateCompanySettings,
  updateMember,
} from '@bjk/api/company';
import { queryKeys } from '@bjk/api/queryKeys';
import type { StaffRole } from '@bjk/api/types/company';

export const useCompanySettings = () => useQuery(companyQueries.settings());

export const useUpdateCompanySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCompanySettings,
    onSuccess: (saved) => queryClient.setQueryData(queryKeys.company.settings(), saved),
  });
};

export const useCreateInvite = () => useMutation({ mutationFn: createInvite });

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: StaffRole }) => updateMember(id, { role }),
    // 직원 목록은 실사 담당자 선택·로그인 이름 목록에서도 쓴다
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.all }),
  });
};
