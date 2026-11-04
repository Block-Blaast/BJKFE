import { useQuery } from '@tanstack/react-query';

import { reportQueries } from '@bjk/api/reports';

export const usePurchaseOrders = () => useQuery(reportQueries.purchaseOrders());

export const useSimReports = () => useQuery(reportQueries.sim());
