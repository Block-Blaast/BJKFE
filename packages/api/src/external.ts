import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { ExternalAlert } from './types/external';

export const getExternalAlerts = () => request<ExternalAlert[]>(ENDPOINTS.externalAlerts);

// TODO(F-EXT): SSE(external.alert)가 생기면 refetchInterval 을 지우고 이벤트로 무효화한다
const POLL_MS = 5000;

export const externalQueries = {
  alerts: () =>
    queryOptions({
      queryKey: queryKeys.external.alerts(),
      queryFn: getExternalAlerts,
      refetchInterval: POLL_MS,
    }),
};
