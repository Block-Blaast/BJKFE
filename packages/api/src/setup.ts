import { queryOptions } from '@tanstack/react-query';

import { itemsOf, request, USES_BACKEND } from './client';
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

const post = <T>(path: string, body: unknown, method = 'POST') =>
  request<T>(path, { method, body: JSON.stringify(body) });

// 백엔드 기준 정보 응답은 부품 단위를 주지 않는다
const DEFAULT_UNIT = '개';

// ---- 카테고리 (SET-06) ----
// 커서 목록이다. 한 번에 최대 100개라 next_cursor 가 없을 때까지 이어 받는다
type CategoryPage = { items: CategoryOption[]; next_cursor: string | null };

export const getCategories = async () => {
  const items: CategoryOption[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: '100', ...(cursor ? { cursor } : {}) });
    const page: CategoryPage = await request<CategoryPage>(`${ENDPOINTS.categories}?${query}`);
    items.push(...page.items.map(({ id, name }) => ({ id, name })));
    cursor = page.next_cursor;
  } while (cursor);
  return items;
};

// ---- 부품 엑셀 이관 (SET-01·02) ----
// 목업도 백엔드와 같은 형식으로 응답해 변환하지 않는다
export const uploadPartImport = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return request<ImportPreview>(ENDPOINTS.partImports, { method: 'POST', body: form });
};

export const confirmPartImport = (id: string, input: ConfirmImportInput) =>
  post<ImportResult>(ENDPOINTS.partImportConfirm(id), input);

// ---- 설비 (SET-07) ----
// 시간당 손실 0 은 "손실액 미입력"이다 — 화면은 null 로 받아 금액 대신 "멈추는 설비"만 보여 준다
type BackendEquipment = {
  id: string;
  name: string;
  loss_per_hour: number;
  operating_hours: number;
  parts: { part_id: string; name: string; qty_per_maintenance: number }[];
};

const fromEquipment = (e: BackendEquipment): Equipment => ({
  id: e.id,
  name: e.name,
  parts: e.parts.map((p) => ({
    part_id: p.part_id,
    part_name: p.name,
    unit: DEFAULT_UNIT,
    qty: p.qty_per_maintenance,
  })),
  hourly_loss: e.loss_per_hour || null,
  daily_hours: e.operating_hours,
});

const isBackendEquipment = (e: Equipment | BackendEquipment): e is BackendEquipment =>
  'loss_per_hour' in e;

const equipmentOf = (e: Equipment | BackendEquipment) =>
  isBackendEquipment(e) ? fromEquipment(e) : e;

export const getEquipment = async () =>
  itemsOf<Equipment | BackendEquipment>(
    await request<Equipment[] | { items: BackendEquipment[] }>(
      USES_BACKEND ? `${ENDPOINTS.equipment}?limit=100` : ENDPOINTS.equipment,
    ),
  ).map(equipmentOf);

// 가동 시간을 비우면 백엔드 기본값(8시간)을 쓴다
export const createEquipment = async (input: EquipmentInput) =>
  equipmentOf(
    await post<Equipment | BackendEquipment>(
      ENDPOINTS.equipment,
      USES_BACKEND
        ? {
            name: input.name,
            loss_per_hour: input.hourly_loss ?? 0,
            ...(input.daily_hours === null ? {} : { operating_hours: input.daily_hours }),
            parts: input.parts.map((p) => ({ part_id: p.part_id, qty_per_maintenance: p.qty })),
          }
        : input,
    ),
  );

// ---- 정비 일정 (SET-08·09) ----
// parts 는 확정 필요량 F 에 실제로 쓰는 부품이다(일정에 적은 부품, 없으면 설비 기준)
type BackendMaintenance = {
  id: string;
  equipment: { id: string; name: string };
  scheduled_date: string;
  parts: { part_id: string; name: string; qty: number }[];
  completed_at: string | null;
};

const fromMaintenance = (m: BackendMaintenance): Maintenance => ({
  id: m.id,
  equipment: m.equipment,
  scheduled_on: m.scheduled_date,
  parts: m.parts.map((p) => ({
    part_id: p.part_id,
    part_name: p.name,
    unit: DEFAULT_UNIT,
    qty: p.qty,
  })),
  completed_at: m.completed_at,
});

const maintenanceOf = (m: Maintenance | BackendMaintenance) =>
  'scheduled_date' in m ? fromMaintenance(m) : m;

export const getMaintenance = async () =>
  itemsOf<Maintenance | BackendMaintenance>(
    await request<Maintenance[] | { items: BackendMaintenance[] }>(
      USES_BACKEND ? `${ENDPOINTS.maintenance}?limit=100` : ENDPOINTS.maintenance,
    ),
  ).map(maintenanceOf);

// 부품을 고르지 않으면 required_parts 를 보내지 않는다 — 백엔드가 설비의 정비 1회당 부품을 쓴다
// (빈 배열 [] 은 "필요 부품 없음"이라 F 가 0 이 된다)
export const createMaintenance = async (input: MaintenanceInput) =>
  maintenanceOf(
    await post<Maintenance | BackendMaintenance>(
      ENDPOINTS.maintenance,
      USES_BACKEND
        ? {
            equipment_id: input.equipment_id,
            scheduled_date: input.scheduled_on,
            ...(input.parts.length ? { required_parts: input.parts } : {}),
          }
        : input,
    ),
  );

// 백엔드 응답은 { maintenance_id, completed_at } 뿐이다 — 화면은 목록을 다시 받아 그린다
export const completeMaintenance = (id: string) =>
  post<unknown>(ENDPOINTS.maintenanceComplete(id), {});

// ---- 공급사 (SET-10) ----
// 목록은 거래 부품 수만 주고, 부품별 단가는 상세(GET /suppliers/{id})에만 있다. 공급사는 많지 않아 상세를 모두 받는다
type BackendSupplier = {
  id: string;
  name: string;
  contact: string | null;
  default_lead_time_days: number | null;
  holidays: string[];
  parts?: {
    part_id: string;
    name: string;
    unit_price: number;
    moq: number;
    price_tiers: { min_qty: number; unit_price: number }[];
    shipping_fee: number;
  }[];
};

const fromSupplier = (s: BackendSupplier): Supplier => ({
  id: s.id,
  name: s.name,
  contact: s.contact,
  default_lead_days: s.default_lead_time_days,
  holidays: s.holidays,
  prices: (s.parts ?? []).map((p) => ({
    part_id: p.part_id,
    part_name: p.name,
    unit_price: p.unit_price,
    moq: p.moq,
    tiers: p.price_tiers,
  })),
});

const getSupplier = async (id: string) =>
  fromSupplier(await request<BackendSupplier>(ENDPOINTS.supplier(id)));

export const getSuppliers = async (): Promise<Supplier[]> => {
  if (!USES_BACKEND) return request<Supplier[]>(ENDPOINTS.suppliers);
  const list = await request<{ items: BackendSupplier[] }>(`${ENDPOINTS.suppliers}?limit=100`);
  return Promise.all(list.items.map((s) => getSupplier(s.id)));
};

export const createSupplier = async (input: SupplierInput) => {
  if (!USES_BACKEND) return post<Supplier>(ENDPOINTS.suppliers, input);
  return fromSupplier(
    await post<BackendSupplier>(ENDPOINTS.suppliers, {
      name: input.name,
      contact: input.contact,
      default_lead_time_days: input.default_lead_days,
      holidays: input.holidays,
    }),
  );
};

// 백엔드는 부품별 거래 조건을 통째로 바꾼다(PUT). 화면은 단가·MOQ 만 고치므로,
// 이미 있던 단가 구간·배송비는 상세에서 읽어 그대로 다시 보낸다. MOQ 를 비우면 기존 값, 없으면 1
export const addSupplierPrice = async (id: string, input: SupplierPriceInput) => {
  if (!USES_BACKEND) return post<Supplier>(ENDPOINTS.supplierPrices(id), input);
  const current = await request<BackendSupplier>(ENDPOINTS.supplier(id));
  const existing = current.parts?.find((p) => p.part_id === input.part_id);
  await post<unknown>(
    ENDPOINTS.supplierPart(id, input.part_id),
    {
      unit_price: input.unit_price,
      moq: input.moq ?? existing?.moq ?? 1,
      price_tiers: existing?.price_tiers ?? [],
      shipping_fee: existing?.shipping_fee ?? 0,
    },
    'PUT',
  );
  return getSupplier(id);
};

export const setupQueries = {
  equipment: () => queryOptions({ queryKey: queryKeys.setup.equipment(), queryFn: getEquipment }),
  maintenance: () =>
    queryOptions({ queryKey: queryKeys.setup.maintenance(), queryFn: getMaintenance }),
  suppliers: () => queryOptions({ queryKey: queryKeys.setup.suppliers(), queryFn: getSuppliers }),
  categories: () =>
    queryOptions({ queryKey: queryKeys.setup.categories(), queryFn: getCategories }),
};
