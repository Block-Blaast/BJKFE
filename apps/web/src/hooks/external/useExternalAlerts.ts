import { useQuery } from '@tanstack/react-query';

import { alertsFromStatus, externalQueries } from '@bjk/api/external';

// 외부 요인 현황(DSH-03)에서 주의·높음인 지표를 알림으로. 권한이 없거나(worker) 실패하면 빈 목록이다
export const useExternalAlerts = () =>
  useQuery({ ...externalQueries.status(), select: alertsFromStatus });
