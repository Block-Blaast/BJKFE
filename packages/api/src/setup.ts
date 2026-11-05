import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type {
  CategoryOption,
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

type CategoryPage = { items: CategoryOption[]; next_cursor: string | null };

// SET-06 목록은 커서 페이지(한 번에 최대 100개)라 끝까지 이어 받는다.
export const getCategories = async () => {
  const all: CategoryOption[] = [];
  let cursor: string | null = null;
  do {
    const query: URLSearchParams = new URLSearchParams({
      limit: '100',
      ...(cursor ? { cursor } : {}),
    });
    const page: CategoryPage = await request<CategoryPage>(`${ENDPOINTS.categories}?${query}`);
    all.push(...page.items.map(({ id, name }) => ({ id, name })));
    cursor = page.next_cursor;
  } while (cursor);
  return all;
};

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
  categories: () =>
    queryOptions({ queryKey: queryKeys.setup.categories(), queryFn: getCategories }),
};
