import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { TwinLayout, TwinProjection } from './types/twin';

export const getTwinLayout = () => request<TwinLayout>(ENDPOINTS.twinLayout);

export const getTwinProjection = (withOrders: boolean) =>
  request<TwinProjection>(`${ENDPOINTS.twinProjection}?with_orders=${withOrders}`);

// 배치는 거의 바뀌지 않는다. 예측은 재고·검토가 바뀔 때 twin.all 무효화로 다시 받는다
export const twinQueries = {
  layout: () =>
    queryOptions({
      queryKey: queryKeys.twin.layout(),
      queryFn: getTwinLayout,
      staleTime: 10 * 60 * 1000,
    }),
  projection: (withOrders: boolean) =>
    queryOptions({
      queryKey: queryKeys.twin.projection(withOrders),
      queryFn: () => getTwinProjection(withOrders),
    }),
};
