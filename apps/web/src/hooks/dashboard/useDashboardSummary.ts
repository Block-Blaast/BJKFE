import { useQuery } from '@tanstack/react-query';

import { dashboardQueries } from '@bjk/api/dashboard';

export const useDashboardSummary = () => useQuery(dashboardQueries.summary());
