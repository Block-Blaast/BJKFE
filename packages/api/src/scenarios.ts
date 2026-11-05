import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';

// 운영 시연 시나리오 (BJK-AI-BE #303, 명세 밖). 사장님만 켜고 끈다(그 밖은 403).
// 외부 충격: 해상운임 위험도를 3(높음)으로 고정하고 근거 지표를 바로 다시 계산한다.
// 외부 요인 현황·3D 알림은 바로 바뀌고, 검토는 켠 뒤 새로 만든 것부터 C-09 가 걸린다.
export type ScenarioState = { external_shock: boolean };

export const getScenarios = () => request<ScenarioState>(ENDPOINTS.scenarios);

export const setExternalShock = (enabled: boolean) =>
  request<{ enabled: boolean; r: number; parts_computed: number }>(ENDPOINTS.externalShock, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });

export const scenarioQueries = {
  state: () =>
    queryOptions({ queryKey: queryKeys.scenarios.state(), queryFn: getScenarios, retry: false }),
};
