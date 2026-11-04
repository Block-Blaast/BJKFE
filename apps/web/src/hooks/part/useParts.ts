import { useQuery } from '@tanstack/react-query';

import { partQueries } from '@bjk/api/parts';
import type { PartListFilters } from '@bjk/api/types/part';

export const useParts = (filters: PartListFilters) => useQuery(partQueries.list(filters));

export const usePart = (id: string) => useQuery(partQueries.detail(id));

export const usePartLedger = (id: string) => useQuery(partQueries.ledger(id));

export const usePartForecast = (id: string) => useQuery(partQueries.forecast(id));
