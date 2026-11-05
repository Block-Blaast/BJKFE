import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@bjk/api/queryKeys';
import {
  addSupplierPrice,
  completeMaintenance,
  confirmPartImport,
  createEquipment,
  createMaintenance,
  createSupplier,
  setupQueries,
  uploadPartImport,
} from '@bjk/api/setup';
import type { ConfirmImportInput, SupplierPriceInput } from '@bjk/api/types/setup';

export const useEquipment = () => useQuery(setupQueries.equipment());
export const useMaintenance = () => useQuery(setupQueries.maintenance());
export const useSuppliers = () => useQuery(setupQueries.suppliers());
export const useCategories = () => useQuery(setupQueries.categories());

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
    // 부품·재고(초기 재고는 실사조정 기록)와 중복 의심 쌍이 함께 바뀐다
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.parts.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.twin.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.mergeCandidates.all }),
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

export const useAddSupplierPrice = () =>
  useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupplierPriceInput }) =>
      addSupplierPrice(id, input),
    onSettled: useInvalidateSetup(),
  });
