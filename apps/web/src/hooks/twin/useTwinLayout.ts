import { useQuery } from '@tanstack/react-query';

import { twinQueries } from '@bjk/api/twin';

// W-11 디지털 트윈. 응답의 is_mock(목업 계산 여부)은 그대로 data.is_mock 으로 나간다 — 화면 배지가 쓴다.
export const useTwinLayout = () => useQuery(twinQueries.layout());

// 발주 안 하면 / 발주하면 — 두 경로를 미리 받아 두면 토글할 때 기다리지 않는다
export const useTwinProjection = (withOrders: boolean) =>
  useQuery(twinQueries.projection(withOrders));
