import { useQuery } from '@tanstack/react-query';

import { activityQueries } from '@bjk/api/activity';

export const useTodayActivity = () => useQuery(activityQueries.today());
