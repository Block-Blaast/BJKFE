import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { Part, PartListFilters, StockMovement } from './types/part';

const toSearch = (filters: PartListFilters) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const getParts = (filters: PartListFilters) =>
  request<Part[]>(`${ENDPOINTS.parts}${toSearch(filters)}`);

export const getPart = (id: string) => request<Part>(ENDPOINTS.part(id));

export const getPartLedger = (id: string) => request<StockMovement[]>(ENDPOINTS.partLedger(id));

export const partQueries = {
  list: (filters: PartListFilters) =>
    queryOptions({ queryKey: queryKeys.parts.list(filters), queryFn: () => getParts(filters) }),
  detail: (id: string) =>
    queryOptions({ queryKey: queryKeys.parts.detail(id), queryFn: () => getPart(id) }),
  ledger: (id: string) =>
    queryOptions({ queryKey: queryKeys.parts.ledger(id), queryFn: () => getPartLedger(id) }),
};
