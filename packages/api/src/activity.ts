import { queryOptions } from '@tanstack/react-query';

import { itemsOf, request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { Activity } from './types/activity';

// 백엔드(명세 밖 #275)는 { date, items }, 목업은 배열을 준다. 항목 형식은 같다
export const getTodayActivity = async () =>
  itemsOf(await request<Activity[] | { items: Activity[] }>(ENDPOINTS.activityToday));

export const activityQueries = {
  today: () => queryOptions({ queryKey: queryKeys.activity.today(), queryFn: getTodayActivity }),
};
