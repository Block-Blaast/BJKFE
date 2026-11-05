import { useQuery } from '@tanstack/react-query';

import { externalQueries } from '@bjk/api/external';

// 외부 요인 알림 (F-EXT, [추가]). SSE 연동 전까지 몇 초마다 다시 받는다 — externalQueries 참고
export const useExternalAlerts = () => useQuery(externalQueries.alerts());
