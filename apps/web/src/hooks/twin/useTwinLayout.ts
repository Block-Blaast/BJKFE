import { useQuery } from '@tanstack/react-query';

import { twinQueries } from '@bjk/api/twin';

export const useTwinLayout = () => useQuery(twinQueries.layout());

// 발주 안 하면 / 발주하면 — 두 경로를 미리 받아 두면 토글할 때 기다리지 않는다
export const useTwinProjection = (withOrders: boolean) =>
  useQuery(twinQueries.projection(withOrders));
