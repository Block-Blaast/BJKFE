import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { Activity } from './types/activity';

// manager 이상. 오늘 0시(KST)부터 최신 순 최대 100개, 커서 없음
export const getTodayActivity = async () =>
  (await request<{ date: string; items: Activity[] }>(ENDPOINTS.activityToday)).items;

export const activityQueries = {
  today: () =>
    queryOptions({
      queryKey: queryKeys.activity.today(),
      queryFn: getTodayActivity,
      retry: false,
    }),
};
