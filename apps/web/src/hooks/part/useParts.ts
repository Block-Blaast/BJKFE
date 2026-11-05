import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { partQueries } from '@bjk/api/parts';
import type { PartListFilters } from '@bjk/api/types/part';

// 검색어·필터가 바뀌는 동안 이전 목록을 그대로 보여준다 (입력할 때마다 "불러오는 중"으로 깜빡이지 않게)
export const useParts = (filters: PartListFilters) =>
  useQuery({ ...partQueries.list(filters), placeholderData: keepPreviousData });

export const usePart = (id: string) => useQuery(partQueries.detail(id));

export const usePartLedger = (id: string) => useQuery(partQueries.ledger(id));

export const usePartForecast = (id: string) => useQuery(partQueries.forecast(id));
