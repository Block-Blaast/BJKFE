import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type {
  ConfirmImportInput,
  Equipment,
  EquipmentInput,
  ImportPreview,
  ImportResult,
  Maintenance,
  MaintenanceInput,
  Supplier,
  SupplierInput,
  SupplierPriceInput,
} from './types/setup';

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const uploadPartImport = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return request<ImportPreview>(ENDPOINTS.partImports, { method: 'POST', body: form });
};

export const confirmPartImport = (id: string, input: ConfirmImportInput) =>
  post<ImportResult>(ENDPOINTS.partImportConfirm(id), input);

export const getEquipment = () => request<Equipment[]>(ENDPOINTS.equipment);
export const createEquipment = (input: EquipmentInput) =>
  post<Equipment>(ENDPOINTS.equipment, input);

export const getMaintenance = () => request<Maintenance[]>(ENDPOINTS.maintenance);
export const createMaintenance = (input: MaintenanceInput) =>
  post<Maintenance>(ENDPOINTS.maintenance, input);
export const completeMaintenance = (id: string) =>
  post<Maintenance>(ENDPOINTS.maintenanceComplete(id), {});

export const getSuppliers = () => request<Supplier[]>(ENDPOINTS.suppliers);
export const createSupplier = (input: SupplierInput) => post<Supplier>(ENDPOINTS.suppliers, input);
export const addSupplierPrice = (id: string, input: SupplierPriceInput) =>
  post<Supplier>(ENDPOINTS.supplierPrices(id), input);

export const setupQueries = {
  equipment: () => queryOptions({ queryKey: queryKeys.setup.equipment(), queryFn: getEquipment }),
  maintenance: () =>
    queryOptions({ queryKey: queryKeys.setup.maintenance(), queryFn: getMaintenance }),
  suppliers: () => queryOptions({ queryKey: queryKeys.setup.suppliers(), queryFn: getSuppliers }),
};
