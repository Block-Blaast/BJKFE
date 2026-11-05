import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import type { ImportDependency } from './domain/part';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type {
  CalendarEvent,
  CalendarEventInput,
  CategorySetting,
  ConfirmImportInput,
  Equipment,
  EquipmentInput,
  ImportPreview,
  ImportResult,
  ImportRow,
  Maintenance,
  MaintenanceCompleted,
  MaintenanceInput,
  PriceTier,
  Supplier,
  SupplierInput,
  SupplierPriceInput,
} from './types/setup';

// ---- 백엔드 기준 정보 형식 (BJK-AI-BE docs/api-spec/master-data.md·imports.md) ----
// 화면은 types/setup 형식을 그대로 쓰고, 여기서 백엔드 응답을 그 형식으로 바꾼다.

type Page<T> = { items: T[]; next_cursor: string | null };

type BackendCategory = {
  id: string;
  name: string;
  import_dependency: 'high' | 'medium' | 'low';
  lead_factors: string[];
  price_factors: string[];
  hs_code: string | null;
};

type BackendImportRow = {
  row: number;
  name: string;
  stock: number | null;
  unit: string;
  spec: Record<string, string>;
  suggested_category: { id: string; name: string; confidence: number } | null;
  existing_part_id: string | null;
  duplicate_suspects: { part_id: string; name: string; reason: 'spec_exact' | 'name_similar' }[];
  errors: string[];
  warnings: string[];
};

type BackendImport = {
  import_id: string;
  is_reimport: boolean;
  rows: BackendImportRow[];
  ai: { used: boolean; fallback?: boolean };
};

type BackendEquipment = {
  id: string;
  name: string;
  loss_per_hour: number;
  loss_is_estimate: boolean;
  operating_hours: number;
  parts: { part_id: string; name: string; qty_per_maintenance: number }[];
};

type BackendMaintenance = {
  id: string;
  equipment: { id: string; name: string };
  scheduled_date: string;
  parts: { part_id: string; name: string; qty: number }[];
  parts_source: 'schedule' | 'equipment';
  completed_at: string | null;
};

type BackendSupplier = {
  id: string;
  name: string;
  contact: string | null;
  default_lead_time_days: number | null;
  holidays: string[];
  part_count: number;
};

type BackendSupplierDetail = BackendSupplier & {
  parts: {
    part_id: string;
    name: string;
    unit_price: number;
    moq: number;
    price_tiers: PriceTier[];
    shipping_fee: number;
  }[];
};

const DEPENDENCY: Record<BackendCategory['import_dependency'], ImportDependency> = {
  high: '높음',
  medium: '중간',
  low: '낮음',
};

// 외부 요인 코드 → 화면 라벨 (F-SETUP-03 표의 이름). 모르는 코드는 그대로 보여준다
const FACTOR_LABEL: Record<string, string> = {
  FREIGHT: '해상운임',
  HOLIDAY_KR: '명절(국내)',
  HOLIDAY_CN: '명절(춘절)',
  USDKRW: '환율',
};

const IMPORT_ERROR_LABEL: Record<string, string> = {
  name_required: '부품 이름이 없어요',
  unit_required: '단위가 없어요',
  stock_required: '재고가 없어요',
  stock_invalid: '재고가 숫자가 아니에요',
  unit_price_invalid: '단가가 숫자가 아니에요',
  monthly_estimate_invalid: '월 사용량이 숫자가 아니에요',
  supplier_unknown: '등록되지 않은 공급사라 공급사·단가는 빠져요',
};

const label = (map: Record<string, string>) => (code: string) => map[code] ?? code;

// 커서 목록은 100개씩 끝까지 받는다 (common.md: limit 최대 100)
const fetchAll = async <T>(path: string, params: Record<string, string> = {}) => {
  const items: T[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ ...params, limit: '100' });
    if (cursor) query.set('cursor', cursor);
    const page: Page<T> = await request<Page<T>>(`${path}?${query}`);
    items.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return items;
};

const send = <T>(method: 'POST' | 'PUT' | 'PATCH', path: string, body: unknown) =>
  request<T>(path, { method, body: JSON.stringify(body) });

// ---- 카테고리 (SET-06) ----

const fromCategory = (c: BackendCategory): CategorySetting => ({
  id: c.id,
  name: c.name,
  import_dependency: DEPENDENCY[c.import_dependency],
  factors: [...c.lead_factors, ...c.price_factors].map(label(FACTOR_LABEL)),
  hs_code: c.hs_code,
});

export const getCategories = async () =>
  (await fetchAll<BackendCategory>(ENDPOINTS.categories)).map(fromCategory);

// ---- 부품 엑셀 이관 (SET-01·02) ----

const fromImportRow = (r: BackendImportRow): ImportRow => ({
  row: r.row,
  name: r.name,
  stock: r.stock,
  unit: r.unit,
  spec: r.spec,
  category: r.suggested_category
    ? { id: r.suggested_category.id, name: r.suggested_category.name }
    : null,
  confidence: r.suggested_category?.confidence ?? 0,
  action: r.existing_part_id ? 'update' : 'create',
  duplicate_of: r.duplicate_suspects[0]
    ? { part_id: r.duplicate_suspects[0].part_id, name: r.duplicate_suspects[0].name }
    : null,
  errors: r.errors.map(label(IMPORT_ERROR_LABEL)),
  warnings: r.warnings.map(label(IMPORT_ERROR_LABEL)),
});

export const uploadPartImport = async (file: File): Promise<ImportPreview> => {
  const form = new FormData();
  form.append('file', file);
  const raw = await request<BackendImport>(ENDPOINTS.partImports, { method: 'POST', body: form });
  return {
    id: raw.import_id,
    file_name: file.name,
    is_reimport: raw.is_reimport,
    ai_fallback: !raw.ai.used || Boolean(raw.ai.fallback),
    rows: raw.rows.map(fromImportRow),
  };
};

// stock_mode 는 보내지 않는다 — 서버가 첫 이관은 initial, 재이관은 ignore 로 정한다
export const confirmPartImport = async (id: string, input: ConfirmImportInput) => {
  const raw = await send<ImportResult>('POST', ENDPOINTS.partImportConfirm(id), input);
  return { created: raw.created, updated: raw.updated, adjust_movements: raw.adjust_movements };
};

// ---- 설비 (SET-07) ----

// 설비·정비 응답에는 부품 단위가 없어 부품 목록에서 붙인다. 병합돼 목록에서 빠진 부품은 단위 없이 둔다
type Units = Map<string, string>;

const fetchUnits = async (): Promise<Units> =>
  new Map(
    (await fetchAll<{ id: string; unit: string }>(ENDPOINTS.parts)).map((p) => [p.id, p.unit]),
  );

const partQty = (units: Units, partId: string, name: string, qty: number) => ({
  part_id: partId,
  part_name: name,
  qty,
  unit: units.get(partId) ?? '',
});

const fromEquipment = (units: Units, e: BackendEquipment): Equipment => ({
  id: e.id,
  name: e.name,
  parts: e.parts.map((p) => partQty(units, p.part_id, p.name, p.qty_per_maintenance)),
  // 0 이면 손실액 미입력 (master-data.md)
  hourly_loss: e.loss_per_hour > 0 ? e.loss_per_hour : null,
  daily_hours: e.operating_hours,
});

export const getEquipment = async () => {
  const [items, units] = await Promise.all([
    fetchAll<BackendEquipment>(ENDPOINTS.equipment),
    fetchUnits(),
  ]);
  return items.map((e) => fromEquipment(units, e));
};

// 등록 뒤에는 목록을 다시 받으므로 응답은 쓰지 않는다
export const createEquipment = async (input: EquipmentInput) => {
  await send<BackendEquipment>('POST', ENDPOINTS.equipment, {
    name: input.name,
    loss_per_hour: input.hourly_loss ?? 0,
    ...(input.daily_hours === null ? {} : { operating_hours: input.daily_hours }),
    parts: input.parts.map((p) => ({ part_id: p.part_id, qty_per_maintenance: p.qty })),
  });
};

// ---- 정비 일정 (SET-08·09) ----

const fromMaintenance = (units: Units, m: BackendMaintenance): Maintenance => ({
  id: m.id,
  equipment: m.equipment,
  scheduled_on: m.scheduled_date,
  parts: m.parts.map((p) => partQty(units, p.part_id, p.name, p.qty)),
  parts_from_equipment: m.parts_source === 'equipment',
  completed_at: m.completed_at,
});

export const getMaintenance = async () => {
  const [items, units] = await Promise.all([
    fetchAll<BackendMaintenance>(ENDPOINTS.maintenance),
    fetchUnits(),
  ]);
  return items.map((m) => fromMaintenance(units, m));
};

export const createMaintenance = async (input: MaintenanceInput) => {
  await send<BackendMaintenance>('POST', ENDPOINTS.maintenance, {
    equipment_id: input.equipment_id,
    scheduled_date: input.scheduled_on,
    // 비우면 설비의 정비 1회당 부품·수량을 쓴다
    ...(input.parts.length > 0 ? { required_parts: input.parts } : {}),
  });
};

export const completeMaintenance = (id: string) =>
  send<MaintenanceCompleted>('POST', ENDPOINTS.maintenanceComplete(id), {});

// ---- 공급사 (SET-10) ----

const fromSupplier = (s: BackendSupplierDetail): Supplier => ({
  id: s.id,
  name: s.name,
  contact: s.contact,
  default_lead_days: s.default_lead_time_days,
  holidays: s.holidays,
  prices: s.parts.map((p) => ({
    part_id: p.part_id,
    part_name: p.name,
    unit_price: p.unit_price,
    moq: p.moq,
    tiers: p.price_tiers,
    shipping_fee: p.shipping_fee,
  })),
});

// 목록에는 부품별 거래 조건이 없어 공급사마다 상세를 받는다 (공급사 수는 많아야 수십 곳)
export const getSuppliers = async () => {
  const list = await fetchAll<BackendSupplier>(ENDPOINTS.suppliers);
  const details = await Promise.all(
    list.map((s) => request<BackendSupplierDetail>(ENDPOINTS.supplier(s.id))),
  );
  return details.map(fromSupplier);
};

export const createSupplier = async (input: SupplierInput) =>
  fromSupplier(
    await send<BackendSupplierDetail>('POST', ENDPOINTS.suppliers, {
      name: input.name,
      contact: input.contact,
      default_lead_time_days: input.default_lead_days,
      holidays: input.holidays,
    }),
  );

export const saveSupplierPrice = (supplierId: string, input: SupplierPriceInput) =>
  send<unknown>('PUT', ENDPOINTS.supplierPart(supplierId, input.part_id), {
    unit_price: input.unit_price,
    ...(input.moq === null ? {} : { moq: input.moq }),
    price_tiers: input.tiers,
    shipping_fee: input.shipping_fee,
  });

// ---- 연휴 캘린더 (SET-11) — 아직 화면이 없다 ----

export const getCalendarEvents = () => fetchAll<CalendarEvent>(ENDPOINTS.calendar);

export const createCalendarEvent = (input: CalendarEventInput) =>
  send<CalendarEvent>('POST', ENDPOINTS.calendar, input);

export const deleteCalendarEvent = (id: string) =>
  request<void>(ENDPOINTS.calendarEvent(id), { method: 'DELETE' });

export const setupQueries = {
  categories: () =>
    queryOptions({ queryKey: queryKeys.setup.categories(), queryFn: getCategories }),
  equipment: () => queryOptions({ queryKey: queryKeys.setup.equipment(), queryFn: getEquipment }),
  maintenance: () =>
    queryOptions({ queryKey: queryKeys.setup.maintenance(), queryFn: getMaintenance }),
  suppliers: () => queryOptions({ queryKey: queryKeys.setup.suppliers(), queryFn: getSuppliers }),
  calendar: () =>
    queryOptions({ queryKey: queryKeys.setup.calendar(), queryFn: getCalendarEvents }),
};
