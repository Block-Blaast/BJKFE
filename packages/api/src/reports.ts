import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { PurchaseOrder, SimReport } from './types/report';

export const getPurchaseOrders = () => request<PurchaseOrder[]>(ENDPOINTS.purchaseOrders);

export const getSimReports = () => request<SimReport[]>(ENDPOINTS.simReports);

export const reportQueries = {
  purchaseOrders: () =>
    queryOptions({ queryKey: queryKeys.reports.purchaseOrders(), queryFn: getPurchaseOrders }),
  sim: () => queryOptions({ queryKey: queryKeys.reports.sim(), queryFn: getSimReports }),
};
