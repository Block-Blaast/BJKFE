import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { Activity } from './types/activity';

export const getTodayActivity = () => request<Activity[]>(ENDPOINTS.activityToday);

export const activityQueries = {
  today: () => queryOptions({ queryKey: queryKeys.activity.today(), queryFn: getTodayActivity }),
};
