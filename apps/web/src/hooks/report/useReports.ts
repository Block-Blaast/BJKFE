import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@bjk/api/queryKeys';
import { cancelPurchaseOrder, markPurchaseOrderOrdered, reportQueries } from '@bjk/api/reports';

export const usePurchaseOrders = () => useQuery(reportQueries.purchaseOrders());

export const useSimReports = () => useQuery(reportQueries.sim());

// 주문 완료·취소는 열린 발주(입고 예정 O, C-03)를 바꿔 부품 지표·예측에도 반영된다
const useInvalidateOrders = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.parts.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.twin.all }),
    ]);
};

export const useMarkPurchaseOrderOrdered = () =>
  useMutation({ mutationFn: markPurchaseOrderOrdered, onSettled: useInvalidateOrders() });

export const useCancelPurchaseOrder = () =>
  useMutation({ mutationFn: cancelPurchaseOrder, onSettled: useInvalidateOrders() });
