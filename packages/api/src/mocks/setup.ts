// 개발용 목업 — 기준 정보(W-08)와 리포트(W-09). 값은 명세서 예시만 쓰고, 없는 값은 null 로 비웠다.
// 설비·정비 일정은 명세서에 예시가 없어 빈 목록으로 시작한다(화면에서 등록해 볼 수 있다).
import { delay, http, HttpResponse } from 'msw';

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

// ---- 부품 엑셀 이관 (F-SETUP-01·02) ----
// 목업은 엑셀을 읽지 않는다. 어떤 파일을 올려도 처음 이관한 부품 목록(=고정 데이터)을 다시 올린 것으로 본다.
// 확신도는 목업 값이다 — 카테고리를 정하지 못한 줄을 낮게 두어 "낮은 줄 위로" 정렬을 확인할 수 있게 했다.
const importRows = (): ImportRow[] => [
  ...PART_FIXTURES.map((p, i): ImportRow => ({
    row: i + 2,
    name: p.part_name,
    stock: p.stock ?? 0,
    unit: p.unit,
    spec: p.spec,
    supplier: p.supplier,
    monthly_estimate: p.metrics.estimated ? p.metrics.m : null,
    location: p.location,
    suggestion: {
      spec: p.spec,
      spec_fields: {},
      category: p.category,
      confidence: p.category ? 0.9 : 0.4,
    },
    action: 'update',
    duplicate_of: null,
  })),
  // F-SETUP-02 예시: "육각볼트 M8-20" → 지름 M8, 길이 20. 재고 예시가 없어 0으로 두었다.
  {
    row: PART_FIXTURES.length + 2,
    name: '육각볼트 M8-20',
    stock: 0,
    unit: '개',
    spec: null,
    supplier: null,
    monthly_estimate: null,
    location: null,
    suggestion: {
      spec: 'M8 × 20',
      spec_fields: { 지름: 'M8', 길이: '20' },
      category: '볼트·너트',
      confidence: 0.6,
    },
    action: 'create',
    duplicate_of: { part_id: 'pt-bolt-m8x20', name: '육각볼트 M8×20' },
  },
];

const imports = new Map<string, ImportPreview>();

// ---- 설비·정비·공급사 (F-SETUP-04) ----
const equipment: Equipment[] = [];
const maintenance: Maintenance[] = [];

// 공급사·단가: F-SETUP-01 엑셀 예시(○○베어링상사 18,000원), F-REVIEW-10 예시(6205ZZ MOQ 10, 6204 공급사 B 14,800원,
// V벨트 공급사 A 18,000원). 연락처·기본 납기·휴무일은 예시가 없다.
const suppliers: Supplier[] = [
  {
    id: 'sp-bearing-shop',
    name: '○○베어링상사',
    contact: null,
    default_lead_days: null,
    holidays: [],
    prices: [
      {
        part_id: 'pt-bearing-6205zz',
        part_name: '볼베어링 6205ZZ',
        unit_price: 18000,
        moq: 10,
        tiers: [],
      },
    ],
  },
  {
    id: 'sp-a',
    name: 'A',
    contact: null,
    default_lead_days: null,
    holidays: [],
    prices: [
      { part_id: 'pt-vbelt-a42', part_name: 'V벨트 A-42', unit_price: 18000, moq: null, tiers: [] },
    ],
  },
  {
    id: 'sp-b',
    name: 'B',
    contact: null,
    default_lead_days: null,
    holidays: [],
    prices: [
      {
        part_id: 'pt-bearing-6204',
        part_name: '볼베어링 6204',
        unit_price: 14800,
        moq: null,
        tiers: [],
      },
    ],
  },
];

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
  http.post(ENDPOINTS.partImports, async ({ request }) => {
    await delay(NETWORK_DELAY * 3);
    const file = (await request.formData()).get('file');
    if (!(file instanceof File)) return badRequest('엑셀 파일을 골라 주세요.');
    const preview: ImportPreview = {
      id: `im-${crypto.randomUUID()}`,
      file_name: file.name,
      rows: importRows(),
    };
    imports.set(preview.id, preview);
    return HttpResponse.json(preview);
  }),

  http.post(ENDPOINTS.partImportConfirm(':id'), async ({ params, request }) => {
    await delay(NETWORK_DELAY);
    const preview = imports.get(String(params.id));
    if (!preview) {
      return HttpResponse.json({ message: '이관 미리보기를 찾을 수 없어요.' }, { status: 404 });
    }
    const input = (await request.json()) as ConfirmImportInput;
    const confirmed = preview.rows.filter((r) => input.rows.some((c) => c.row === r.row));
    imports.delete(preview.id);
    return HttpResponse.json({
      created: confirmed.filter((r) => r.action === 'create').length,
      updated: confirmed.filter((r) => r.action === 'update').length,
      merge_candidates: confirmed.filter((r) => r.duplicate_of).length,
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
