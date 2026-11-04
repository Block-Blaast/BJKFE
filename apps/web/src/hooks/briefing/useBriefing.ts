import { useQuery } from '@tanstack/react-query';

import { briefingQueries } from '@bjk/api/briefing';

export const useBriefing = () => useQuery(briefingQueries.today());
