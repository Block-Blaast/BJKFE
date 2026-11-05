// 기준 정보 (W-08, F-SETUP) — 화면이 쓰는 형식. 백엔드 응답(BJK-AI-BE docs/api-spec/master-data.md·imports.md)은
// setup.ts 의 어댑터가 이 형식으로 바꾼다.
import type { ImportDependency } from '../domain/part';

// ---- 카테고리 (SET-06) ----
// 카테고리는 회사마다 서버에 있다. 이관 확정에는 이름이 아니라 id 를 보낸다.

export type CategorySetting = {
  id: string;
  name: string;
  import_dependency: ImportDependency;
  factors: string[]; // 납기·단가 외부 요인 라벨 (예: '해상운임', '환율')
  hs_code: string | null;
};

// ---- 부품 엑셀 이관 (F-SETUP-01·02) ----
// 엑셀은 서버가 읽고 AI 제안까지 붙여 미리보기로 돌려준다. 관리자는 틀린 것만 고친 뒤 확정한다.

export type ImportRow = {
  row: number; // 엑셀 줄 번호
  name: string;
  stock: number | null; // 오류 줄이면 null
  unit: string;
  spec: Record<string, string>; // 예: { 지름: 'M8', 길이: '20' }
  category: { id: string; name: string } | null; // AI 제안
  confidence: number; // 0~1, 제안 없음은 0
  // 부품명+규격이 이미 있으면 새로 만들지 않고 갱신한다 (같은 파일을 다시 올려도 중복 없음)
  action: 'create' | 'update';
  // 규격 일치 또는 이름 유사 — 등록 뒤 병합 여부를 묻는다 (F-MATCH-03)
  duplicate_of: { part_id: string; name: string } | null;
  errors: string[]; // 있으면 확정할 수 없다
  warnings: string[]; // 확정은 되지만 값이 반영되지 않는다
};

export type ImportPreview = {
  id: string;
  file_name: string; // 올린 파일 이름 (화면에서 붙인다)
  // 이미 확정한 이관이 있으면 재이관 — 기존 부품 재고는 바꾸지 않는다(stock_mode 기본 ignore)
  is_reimport: boolean;
  // AI 제안이 실패해 정규식 규격만 있고 카테고리 제안이 없다
  ai_fallback: boolean;
  rows: ImportRow[]; // 서버 정렬: 오류 줄 → 확신도 낮은 줄 → 파일 순서
};

export type ConfirmImportInput = {
  // spec·category_id 를 비우면 서버가 SET-01 제안 값을 쓴다
  rows: { row: number; spec: Record<string, string> | null; category_id: string | null }[];
};

export type ImportResult = {
  created: number;
  updated: number;
  adjust_movements: number; // 재고 원장에 남긴 실사조정 건수
};

// ---- 설비·정비·공급사 (F-SETUP-04) ----

// unit 은 부품 목록에서 붙인다 (설비·정비 응답에는 없다)
export type PartQty = { part_id: string; part_name: string; qty: number; unit: string };

export type Equipment = {
  id: string;
  name: string;
  parts: PartQty[]; // 정비 1회당 부품·수량
  // 없으면 손실 금액 대신 "멈추는 설비"만 보여준다
  hourly_loss: number | null;
  daily_hours: number;
};

export type EquipmentInput = {
  name: string;
  parts: { part_id: string; qty: number }[];
  hourly_loss: number | null;
  daily_hours: number | null; // 비우면 서버 기본 8시간
};

export type Maintenance = {
  id: string;
  equipment: { id: string; name: string };
  scheduled_on: string; // YYYY-MM-DD
  parts: PartQty[]; // 확정 필요량 F
  // 일정에 필요 부품이 없으면 설비의 정비 1회당 부품을 쓴다
  parts_from_equipment: boolean;
  completed_at: string | null;
};

export type MaintenanceInput = {
  equipment_id: string;
  scheduled_on: string;
  parts: { part_id: string; qty: number }[]; // 비우면 설비 기준 부품
};

export type MaintenanceCompleted = { maintenance_id: string; completed_at: string };

export type PriceTier = { min_qty: number; unit_price: number };

export type SupplierPrice = {
  part_id: string;
  part_name: string;
  unit_price: number;
  moq: number;
  tiers: PriceTier[]; // 단가 구간
  shipping_fee: number;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string | null;
  // 실제 납기 기록이 쌓일 때까지 쓰는 기본 납기(일). 비우면 서버가 7일로 계산한다
  default_lead_days: number | null;
  holidays: string[]; // YYYY-MM-DD
  prices: SupplierPrice[];
};

export type SupplierInput = {
  name: string;
  contact: string | null;
  default_lead_days: number | null;
  holidays: string[];
};

// 부품별 거래 조건은 통째로 바뀐다 — 단가 구간·배송비를 빼면 지워진다
export type SupplierPriceInput = {
  part_id: string;
  unit_price: number;
  moq: number | null;
  tiers: PriceTier[];
  shipping_fee: number;
};

// ---- 연휴 캘린더 (SET-11) ----

export type CalendarScope = 'KR' | 'CN' | 'supplier';

export type CalendarEvent = {
  id: string;
  name: string;
  start: string; // YYYY-MM-DD
  end: string;
  scope: CalendarScope;
  supplier_id: string | null;
};

export type CalendarEventInput = Omit<CalendarEvent, 'id'>;
