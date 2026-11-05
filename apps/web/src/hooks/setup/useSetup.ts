import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@bjk/api/queryKeys';
import {
  completeMaintenance,
  confirmPartImport,
  createEquipment,
  createMaintenance,
  createSupplier,
  saveSupplierPrice,
  setupQueries,
  uploadPartImport,
} from '@bjk/api/setup';
import type { ConfirmImportInput, SupplierPriceInput } from '@bjk/api/types/setup';

export const useCategories = () => useQuery(setupQueries.categories());
export const useEquipment = () => useQuery(setupQueries.equipment());
export const useMaintenance = () => useQuery(setupQueries.maintenance());
export const useSuppliers = () => useQuery(setupQueries.suppliers());

const useInvalidateSetup = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.setup.all });
};

export const useUploadPartImport = () => useMutation({ mutationFn: uploadPartImport });

export const useConfirmPartImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ConfirmImportInput }) =>
      confirmPartImport(id, input),
    // 부품·재고(초기 재고는 실사조정 기록)와 중복 의심 쌍, 공급사 단가가 함께 바뀐다
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.parts.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.twin.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.mergeCandidates.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.setup.suppliers() }),
      ]),
  });
};

export const useCreateEquipment = () =>
  useMutation({ mutationFn: createEquipment, onSettled: useInvalidateSetup() });

export const useCreateMaintenance = () =>
  useMutation({ mutationFn: createMaintenance, onSettled: useInvalidateSetup() });

export const useCompleteMaintenance = () =>
  useMutation({ mutationFn: completeMaintenance, onSettled: useInvalidateSetup() });

export const useCreateSupplier = () =>
  useMutation({ mutationFn: createSupplier, onSettled: useInvalidateSetup() });

export const useSaveSupplierPrice = () =>
  useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupplierPriceInput }) =>
      saveSupplierPrice(id, input),
    onSettled: useInvalidateSetup(),
  });
