import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@bjk/api/queryKeys';
import { scenarioQueries, setExternalShock } from '@bjk/api/scenarios';

export const useScenarios = () => useQuery(scenarioQueries.state());

// 근거 지표가 다시 계산되므로 외부 요인·3D 창고·부품·대시보드 숫자를 모두 다시 받는다
export const useSetExternalShock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setExternalShock,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.scenarios.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.external.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.twin.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.parts.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]),
  });
};
