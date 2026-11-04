import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { Briefing } from './types/briefing';

export const getBriefing = () => request<Briefing>(ENDPOINTS.briefing);

export const briefingQueries = {
  today: () =>
    queryOptions({
      queryKey: queryKeys.briefing.all,
      queryFn: getBriefing,
    }),
};
