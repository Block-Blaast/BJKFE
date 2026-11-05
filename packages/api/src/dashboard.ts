import { queryOptions } from '@tanstack/react-query';

import { request, USES_BACKEND } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';

// 대시보드 요약 (BJK-AI-BE DSH-01 GET /dashboard/summary). 화면은 결품 위험 순위와 묶인 재고 금액만 쓴다.
// 순위는 새벽 계산의 우선순위(결품 확률 × 예상 손실, F-ANAL-08), 묶인 재고는 오래 안 쓴 재고 × 단가다.
type BackendSummary = {
  risk_top5: { part_id: string; priority: number }[];
  tied_up_stock_amount: number;
  computed_at: string | null;
};

export type DashboardSummary = {
  riskPartIds: string[];
  tiedUpAmount: number;
  computedAt: string | null;
};

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const raw = await request<BackendSummary>(ENDPOINTS.dashboardSummary);
  return {
    riskPartIds: raw.risk_top5.map((r) => r.part_id),
    tiedUpAmount: raw.tied_up_stock_amount,
    computedAt: raw.computed_at,
  };
};

export const dashboardQueries = {
  // 목업에는 요약이 없다 — 목업 모드에서는 부품 목록으로 계산한다
  summary: () =>
    queryOptions({
      queryKey: queryKeys.dashboard.summary(),
      queryFn: getDashboardSummary,
      enabled: USES_BACKEND,
    }),
};
