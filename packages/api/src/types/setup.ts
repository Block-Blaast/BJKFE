// 기준 정보 (W-08, F-SETUP) — 임시 계약. 항목은 명세서 F-SETUP-01·02·04 표를 따랐고 HTTP 형식은 명세서에 없다.
// 엑셀 이관은 백엔드 스키마(imports/service.py ImportOut·ConfirmRequest·ConfirmOut)를 그대로 옮겼다.
// 백엔드 OpenAPI 가 나오면 생성된 타입으로 교체하고, 이 파일을 지운다.
import type { StockMode } from '../domain/setup';

// ---- 카테고리 (SET-06) ----
// 회사가 정한 카테고리. 엑셀 이관의 category_id 는 이 id(uuid)를 쓴다 — 화면 상수 CATEGORIES 가 아니다.
export type CategoryOption = { id: string; name: string };

// ---- 부품 엑셀 이관 (SET-01·02, F-SETUP-01·02) ----
// 엑셀은 서버가 읽고 AI 제안까지 붙여 미리보기로 돌려준다. 관리자는 틀린 것만 고친 뒤 확정한다.
// 줄은 서버가 오류 있는 줄 → 확신도 낮은 줄 → 파일 순서로 정렬해 준다.

export type ImportRow = {
  row: number; // 엑셀 화면의 줄 번호
  name: string;
  stock: number | null; // 숫자가 아니면 null (errors 에 사유)
  unit: string;
  spec: Record<string, string>; // 규칙(정규식)과 AI 가 뽑은 규격. 키는 SPEC_KEY_LABEL
  suggested_category: { id: string; name: string; confidence: number } | null;
  // 부품명+규격이 이미 있으면 새로 만들지 않고 갱신한다 (같은 파일을 다시 올려도 중복 없음)
  existing_part_id: string | null;
  // 규격이 같거나 이름이 비슷한 기존 부품 (최대 3개). 고르면 그 부품에 합친다 (F-MATCH-03)
  duplicate_suspects: { part_id: string; name: string; reason: 'spec_exact' | 'name_similar' }[];
  errors: string[]; // 있으면 이 줄은 확정할 수 없다. 코드는 IMPORT_ROW_ERROR_LABEL
  warnings: string[]; // 반영은 되지만 일부 값은 무시된다. 코드는 IMPORT_ROW_WARNING_LABEL
};

export type ImportPreview = {
  import_id: string;
  is_reimport: boolean;
  rows: ImportRow[];
  // AI 가 실패해도 200 — fallback 이면 규격은 규칙 결과뿐이고 카테고리 제안이 없다
  ai: { used: boolean; fallback: boolean; reason: string | null };
};

export type ConfirmImportRow = {
  row: number;
  category_id?: string | null; // 비우면 서버가 AI 제안 카테고리를 쓴다
  spec?: Record<string, string> | null; // 비우면 미리보기 규격을 그대로 쓴다
  merge_with_part_id?: string | null;
};

export type ConfirmImportInput = {
  rows: ConfirmImportRow[]; // 1개 이상. errors 있는 줄은 보내지 않는다
  stock_mode?: StockMode | null; // 생략하면 처음 이관은 initial, 재이관은 ignore
};

export type StockDiff = {
  row: number;
  part_id: string | null;
  name: string;
  ledger_stock: number;
  file_stock: number;
  diff: number;
};

export type ImportResult = {
  created: number;
  updated: number;
  adjust_movements: number;
  // preview 는 차이 있는 줄만, apply 는 실제로 조정한 줄
  stock_diffs: StockDiff[];
};

// ---- 설비·정비·공급사 (F-SETUP-04) ----

export type PartQty = { part_id: string; part_name: string; unit: string; qty: number };

export type Equipment = {
  id: string;
  name: string;
  parts: PartQty[]; // 쓰는 부품과 설비당 수량
  // 없으면 손실 금액 대신 "멈추는 설비"만 보여준다
  hourly_loss: number | null;
  daily_hours: number | null;
};

export type EquipmentInput = {
  name: string;
  parts: { part_id: string; qty: number }[];
  hourly_loss: number | null;
  daily_hours: number | null;
};

export type Maintenance = {
  id: string;
  equipment: { id: string; name: string };
  scheduled_on: string; // YYYY-MM-DD
  parts: PartQty[]; // 확정 필요량 F
  completed_at: string | null;
};

export type MaintenanceInput = {
  equipment_id: string;
  scheduled_on: string;
  parts: { part_id: string; qty: number }[];
};

export type SupplierPrice = {
  part_id: string;
  part_name: string;
  unit_price: number;
  moq: number | null;
  tiers: { min_qty: number; unit_price: number }[]; // 단가 구간
};

export type Supplier = {
  id: string;
  name: string;
  contact: string | null;
  // 실제 납기 기록이 쌓일 때까지 쓰는 기본 납기(일)
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

export type SupplierPriceInput = {
  part_id: string;
  unit_price: number;
  moq: number | null;
};
