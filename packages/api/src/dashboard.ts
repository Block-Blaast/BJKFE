import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { DashboardSummary, RiskItem } from './types/dashboard';

// 백엔드는 예상 손실을 수식 기호 그대로 L 로 준다
type BackendSummary = Omit<DashboardSummary, 'risk_top5'> & {
  risk_top5: (Omit<RiskItem, 'loss'> & { L: number })[];
};

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const { risk_top5, ...rest } = await request<BackendSummary>(ENDPOINTS.dashboardSummary);
  return { ...rest, risk_top5: risk_top5.map(({ L, ...r }) => ({ ...r, loss: L })) };
};

export const dashboardQueries = {
  summary: () =>
    queryOptions({
      queryKey: queryKeys.dashboard.summary(),
      queryFn: getDashboardSummary,
    }),
};
