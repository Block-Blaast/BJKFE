// 개발용 목업 — 기준 정보(W-08)와 리포트(W-09). 설비·정비·공급사는 가상 공장(fixtures/factory.ts) 값으로 시작한다.
import { delay, http, HttpResponse } from 'msw';

import { CATEGORIES } from '../domain/part';
import type { ApprovalAction } from '../domain/review';
import { ENDPOINTS } from '../endpoints';
import type { PurchaseOrder, SimReport } from '../types/report';
import type { Review } from '../types/review';
import type {
  ConfirmImportInput,
  Equipment,
  EquipmentInput,
  ImportPreview,
  ImportResult,
  ImportRow,
  Maintenance,
  MaintenanceInput,
  PartQty,
  Supplier,
  SupplierInput,
  SupplierPriceInput,
} from '../types/setup';
import { MOCK_OWNER } from './fixtures/auth';
import { EQUIPMENT_FIXTURES, MAINTENANCE_FIXTURES, SUPPLIER_FIXTURES } from './fixtures/factory';
import { PART_FIXTURES } from './fixtures/parts';

const NETWORK_DELAY = 400;

const findPart = (id: string) => PART_FIXTURES.find((p) => p.part_id === id);

const toPartQty = (parts: { part_id: string; qty: number }[]): PartQty[] | null => {
  const result: PartQty[] = [];
  for (const { part_id, qty } of parts) {
    const part = findPart(part_id);
    if (!part || !(qty > 0)) return null;
    result.push({ part_id, part_name: part.part_name, unit: part.unit, qty });
  }
  return result;
};

const badRequest = (message: string) => HttpResponse.json({ message }, { status: 400 });

// ---- 카테고리 (SET-06) ----
// 백엔드 카테고리는 회사마다 uuid 다. 목업은 화면 상수 이름에 고정 id 를 붙인다.
const MOCK_CATEGORIES = CATEGORIES.map((name, i) => ({ id: `cat-${i + 1}`, name }));
const categoryOf = (name: string | null) => MOCK_CATEGORIES.find((c) => c.name === name) ?? null;

// ---- 부품 엑셀 이관 (SET-01·02, F-SETUP-01·02) ----
// 목업은 엑셀을 읽지 않는다. 어떤 파일을 올려도 처음 이관한 부품 목록(=고정 데이터)을 다시 올린 것으로 본다(재이관).
// 확신도는 목업 값이다 — 카테고리를 정하지 못한 줄을 낮게 두어 "낮은 줄 위로" 정렬을 확인할 수 있게 했다.
// 앞의 두 줄은 파일 재고를 장부와 다르게 두어 재이관 재고 차이(preview → apply)를 확인할 수 있게 했다.
const FILE_STOCK_DELTA = [2, -1];

type MockImport = { preview: ImportPreview; previewed: boolean };

const importRows = (): ImportRow[] => [
  ...PART_FIXTURES.map((p, i): ImportRow => {
    const category = categoryOf(p.category);
    return {
      row: i + 2,
      name: p.part_name,
      stock: Math.max(0, (p.stock ?? 0) + (FILE_STOCK_DELTA[i] ?? 0)),
      unit: p.unit,
      // 고정 데이터 규격은 한 줄 문자열이라 키를 나누지 않는다 (SPEC_KEY_LABEL 에 없는 키는 이름 그대로 보인다)
      spec: p.spec ? { 규격: p.spec } : {},
      suggested_category: category ? { ...category, confidence: 0.9 } : null,
      existing_part_id: p.part_id,
      duplicate_suspects: [],
      errors: [],
      warnings: [],
    };
  }),
  // F-SETUP-02 예시: "육각볼트 M8-20" → 지름 M8, 길이 20. 재고 예시가 없어 0으로 두었다.
  {
    row: PART_FIXTURES.length + 2,
    name: '육각볼트 M8-20',
    stock: 0,
    unit: '개',
    spec: { thread: 'M8', length_mm: '20' },
    suggested_category: { ...categoryOf('볼트·너트')!, confidence: 0.6 },
    existing_part_id: null,
    duplicate_suspects: [
      { part_id: 'pt-bolt-m8x20', name: '육각볼트 M8×20', reason: 'spec_exact' },
    ],
    errors: [],
    warnings: ['supplier_unknown'],
  },
  // 재고 칸이 비어 확정할 수 없는 줄
  {
    row: PART_FIXTURES.length + 3,
    name: '스프링 와셔 M8',
    stock: null,
    unit: '개',
    spec: { thread: 'M8' },
    suggested_category: null,
    existing_part_id: null,
    duplicate_suspects: [],
    errors: ['stock_required'],
    warnings: [],
  },
];

// 백엔드처럼 오류 줄 → 확신도 낮은 줄 → 파일 순서
const byServerOrder = (a: ImportRow, b: ImportRow) =>
  Number(!a.errors.length) - Number(!b.errors.length) ||
  (a.suggested_category?.confidence ?? 0) - (b.suggested_category?.confidence ?? 0) ||
  a.row - b.row;

const imports = new Map<string, MockImport>();

const ledgerStockOf = (partId: string | null) =>
  (partId && PART_FIXTURES.find((p) => p.part_id === partId)?.stock) || 0;

// ---- 설비·정비·공급사 (F-SETUP-04) ----
// 가상 공장(fixtures/factory.ts)의 설비·정비·공급사로 시작한다. 화면에서 더 등록할 수 있다.
const equipment: Equipment[] = EQUIPMENT_FIXTURES.map((e) => ({
  id: e.id,
  name: e.name,
  parts: toPartQty(e.parts) ?? [],
  hourly_loss: e.hourly_loss,
  daily_hours: e.daily_hours,
}));

const maintenance: Maintenance[] = MAINTENANCE_FIXTURES.map((m) => {
  const target = EQUIPMENT_FIXTURES.find((e) => e.id === m.equipment_id)!;
  return {
    id: m.id,
    equipment: { id: target.id, name: target.name },
    scheduled_on: m.scheduled_on,
    parts: toPartQty(m.parts) ?? [],
    completed_at: null,
  };
});

// 3D 창고 예측(twin.ts)이 확정 필요량 F 로 쓴다
export const currentMaintenance = () => maintenance;

// 단가는 부품의 기본 공급사 단가에서 만든다. MOQ 는 6205ZZ 10개(F-REVIEW-10)만 명세서 값이고 나머지는 가상 값이다.
// 6204 의 공급사 B(→ 신흥베어링) 14,800원은 F-REVIEW-10 예시.
const MOQ: Record<string, number> = {
  'pt-bearing-6205zz': 10,
  'pt-bearing-6305zz': 4,
  'pt-bolt-m10x30': 100,
  'pt-capscrew-m6x15': 100,
  'pt-nut-m8': 200,
  'pt-washer-m8': 200,
  'pt-nut-m10': 100,
  'pt-insert-cnmg': 10,
};
// 재고 부족 초안(F-NOTI-01)이 권장 발주량을 최소 주문 수량에 맞출 때 쓴다
export const moqOf = (partId: string) => MOQ[partId] ?? null;

const EXTRA_PRICES: { supplier: string; part_id: string; unit_price: number }[] = [
  { supplier: '신흥베어링', part_id: 'pt-bearing-6204', unit_price: 14800 },
  // 6205ZZ 대체 공급처 — 더 싸지만 납기가 길다 (시연: C-06 더 싼 공급사)
  { supplier: '신흥베어링', part_id: 'pt-bearing-6205zz', unit_price: 16200 },
];

const suppliers: Supplier[] = SUPPLIER_FIXTURES.map((sp) => ({
  ...sp,
  prices: [
    ...PART_FIXTURES.filter((p) => p.supplier?.name === sp.name && p.supplier.unit_price !== null),
    ...EXTRA_PRICES.filter((x) => x.supplier === sp.name).map((x) => findPart(x.part_id)!),
  ].map((p) => {
    const extra = EXTRA_PRICES.find((x) => x.supplier === sp.name && x.part_id === p.part_id);
    return {
      part_id: p.part_id,
      part_name: p.part_name,
      unit_price: extra?.unit_price ?? p.supplier!.unit_price!,
      moq: MOQ[p.part_id] ?? null,
      tiers: [],
    };
  }),
}));

// ---- 리포트 (W-09) ----
const purchaseOrders: PurchaseOrder[] = [];
const simReports: SimReport[] = [];

const ORDERING_ACTIONS: ApprovalAction[] = ['approveProposal', 'approveOriginal', 'editAndApprove'];

// 승인 직후 발주 기록이 생긴다 (F-APPROVAL-03). 로그인 연동 전이라 승인자는 사장님으로 둔다.
// 목업에는 PDF 생성기가 없어 pdf_url 은 null 이다.
export const recordPurchaseOrder = (review: Review) => {
  const action = review.decision?.action;
  if (!action || !ORDERING_ACTIONS.includes(action)) return;
  const line = action === 'approveProposal' ? review.proposal : review.original;
  if (line.qty <= 0) return;
  purchaseOrders.unshift({
    id: `po-${review.id}`,
    review_id: review.id,
    part: {
      id: review.part.id,
      name: review.part.name,
      spec: findPart(review.part.id)?.spec ?? null,
      unit: review.part.unit,
    },
    qty: line.qty,
    supplier: line.supplier,
    unit_price: line.unit_price,
    total: line.total,
    desired_date: null,
    action,
    approved_by: MOCK_OWNER.name,
    approved_at: review.decision?.decided_at ?? new Date().toISOString(),
    pdf_url: null,
  });
};

export const setupHandlers = [
  http.get(ENDPOINTS.categories, async () => {
    await delay(NETWORK_DELAY);
    return HttpResponse.json({ items: MOCK_CATEGORIES, next_cursor: null });
  }),

  http.post(ENDPOINTS.partImports, async ({ request }) => {
    await delay(NETWORK_DELAY * 3);
    const file = (await request.formData()).get('file');
    if (!(file instanceof File)) return badRequest('엑셀 파일을 골라 주세요.');
    const preview: ImportPreview = {
      import_id: crypto.randomUUID(),
      is_reimport: true,
      rows: importRows().sort(byServerOrder),
      ai: { used: true, fallback: false, reason: null },
    };
    imports.set(preview.import_id, { preview, previewed: false });
    return HttpResponse.json(preview);
  }),

  // 백엔드 confirm_import 의 stock_mode 규칙을 따른다. 목업은 부품·장부를 실제로 바꾸지 않는다.
  http.post(ENDPOINTS.partImportConfirm(':id'), async ({ params, request }) => {
    await delay(NETWORK_DELAY);
    const record = imports.get(String(params.id));
    if (!record) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: '이관 기록을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    const { preview } = record;
    const input = (await request.json()) as ConfirmImportInput;
    const mode = input.stock_mode ?? (preview.is_reimport ? 'ignore' : 'initial');
    if (!input.rows.length) return badRequest('확정할 줄을 골라 주세요.');
    if (mode === 'initial' && preview.is_reimport) {
      return badRequest('재이관은 initial을 쓸 수 없습니다. ignore·preview·apply 중에서 고르세요.');
    }
    if (mode === 'apply' && !record.previewed) {
      return badRequest('재고 차이를 먼저 확인해 주세요(preview).');
    }
    const seen = new Set<number>();
    for (const c of input.rows) {
      const stored = preview.rows.find((r) => r.row === c.row);
      if (!stored || seen.has(c.row)) return badRequest('파일에 없는 줄입니다.');
      if (stored.errors.length) return badRequest('오류가 있는 줄은 확정할 수 없습니다.');
      if (c.category_id && !MOCK_CATEGORIES.some((cat) => cat.id === c.category_id)) {
        return badRequest('없는 카테고리입니다.');
      }
      seen.add(c.row);
    }
    const chosen = input.rows.map((c) => {
      const stored = preview.rows.find((r) => r.row === c.row)!;
      const partId = c.merge_with_part_id ?? stored.existing_part_id;
      const ledger = ledgerStockOf(partId);
      const fileStock = stored.stock ?? 0;
      return {
        partId,
        diff: {
          row: c.row,
          part_id: partId,
          name: stored.name,
          ledger_stock: ledger,
          file_stock: fileStock,
          diff: fileStock - ledger,
        },
      };
    });
    const existing = chosen.filter((c) => c.partId);
    const diffs = existing.map((c) => c.diff).filter((d) => d.diff);
    if (mode === 'preview') {
      record.previewed = true;
      return HttpResponse.json({
        created: 0,
        updated: 0,
        adjust_movements: 0,
        stock_diffs: diffs,
      } satisfies ImportResult);
    }
    imports.delete(preview.import_id);
    const created = chosen.length - existing.length;
    return HttpResponse.json({
      created,
      updated: existing.length,
      adjust_movements:
        chosen.filter((c) => !c.partId && c.diff.file_stock).length +
        (mode === 'apply' ? diffs.length : 0),
      stock_diffs: mode === 'apply' ? diffs : [],
    } satisfies ImportResult);
  }),

  http.get(ENDPOINTS.equipment, async () => {
    await delay(NETWORK_DELAY);
    return HttpResponse.json(equipment);
  }),

  http.post(ENDPOINTS.equipment, async ({ request }) => {
    await delay(NETWORK_DELAY);
    const input = (await request.json()) as EquipmentInput;
    const parts = toPartQty(input.parts);
    if (!input.name.trim()) return badRequest('설비 이름을 입력해 주세요.');
    if (!parts) return badRequest('부품과 수량을 확인해 주세요.');
    const created: Equipment = {
      id: `eq-${crypto.randomUUID()}`,
      name: input.name.trim(),
      parts,
      hourly_loss: input.hourly_loss,
      daily_hours: input.daily_hours,
    };
    equipment.push(created);
    return HttpResponse.json(created);
  }),

  http.get(ENDPOINTS.maintenance, async () => {
    await delay(NETWORK_DELAY);
    return HttpResponse.json(
      [...maintenance].sort((a, b) => a.scheduled_on.localeCompare(b.scheduled_on)),
    );
  }),

  http.post(ENDPOINTS.maintenance, async ({ request }) => {
    await delay(NETWORK_DELAY);
    const input = (await request.json()) as MaintenanceInput;
    const target = equipment.find((e) => e.id === input.equipment_id);
    const parts = toPartQty(input.parts);
    if (!target) return badRequest('설비를 골라 주세요.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.scheduled_on)) return badRequest('예정일을 골라 주세요.');
    if (!parts) return badRequest('부품과 수량을 확인해 주세요.');
    const created: Maintenance = {
      id: `mt-${crypto.randomUUID()}`,
      equipment: { id: target.id, name: target.name },
      scheduled_on: input.scheduled_on,
      parts,
      completed_at: null,
    };
    maintenance.push(created);
    return HttpResponse.json(created);
  }),

  http.post(ENDPOINTS.maintenanceComplete(':id'), async ({ params }) => {
    await delay(NETWORK_DELAY);
    const item = maintenance.find((m) => m.id === params.id);
    if (!item)
      return HttpResponse.json({ message: '정비 일정을 찾을 수 없어요.' }, { status: 404 });
    item.completed_at ??= new Date().toISOString();
    return HttpResponse.json(item);
  }),

  http.get(ENDPOINTS.suppliers, async () => {
    await delay(NETWORK_DELAY);
    return HttpResponse.json(suppliers);
  }),

  http.post(ENDPOINTS.suppliers, async ({ request }) => {
    await delay(NETWORK_DELAY);
    const input = (await request.json()) as SupplierInput;
    const name = input.name.trim();
    if (!name) return badRequest('공급사 이름을 입력해 주세요.');
    if (suppliers.some((s) => s.name === name)) {
      return HttpResponse.json({ message: '이미 등록된 공급사예요.' }, { status: 409 });
    }
    const created: Supplier = {
      id: `sp-${crypto.randomUUID()}`,
      name,
      contact: input.contact?.trim() || null,
      default_lead_days: input.default_lead_days,
      holidays: input.holidays,
      prices: [],
    };
    suppliers.push(created);
    return HttpResponse.json(created);
  }),

  http.post(ENDPOINTS.supplierPrices(':id'), async ({ params, request }) => {
    await delay(NETWORK_DELAY);
    const supplier = suppliers.find((s) => s.id === params.id);
    if (!supplier)
      return HttpResponse.json({ message: '공급사를 찾을 수 없어요.' }, { status: 404 });
    const input = (await request.json()) as SupplierPriceInput;
    const part = findPart(input.part_id);
    if (!part) return badRequest('부품을 골라 주세요.');
    if (!(input.unit_price > 0)) return badRequest('단가를 입력해 주세요.');
    supplier.prices = [
      ...supplier.prices.filter((p) => p.part_id !== part.part_id),
      {
        part_id: part.part_id,
        part_name: part.part_name,
        unit_price: input.unit_price,
        moq: input.moq,
        tiers: [],
      },
    ];
    return HttpResponse.json(supplier);
  }),

  http.get(ENDPOINTS.purchaseOrders, async () => {
    await delay(NETWORK_DELAY);
    return HttpResponse.json(purchaseOrders);
  }),

  http.get(ENDPOINTS.simReports, async () => {
    await delay(NETWORK_DELAY);
    return HttpResponse.json(simReports);
  }),
];
