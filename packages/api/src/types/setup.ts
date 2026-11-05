// 기준 정보 (W-08, F-SETUP) — 임시 계약(부품 엑셀 이관은 백엔드 형식). 항목은 명세서 F-SETUP-01·02·04 표를 따랐고 HTTP 형식은 명세서에 없다.
// 백엔드 OpenAPI 가 나오면 생성된 타입으로 교체하고, 이 파일을 지운다.
import type { ImportRowError, ImportRowWarning } from '../domain/partImport';

// ---- 부품 엑셀 이관 (F-SETUP-01·02, 백엔드 SET-01·02) ----
// 형식은 BJK-AI-BE docs/api-spec/imports.md 그대로다. 목업도 같은 형식을 준다.
// 서버가 파일(xlsx·csv)을 읽고 규격·카테고리 제안까지 붙여 돌려준다. 관리자는 틀린 것만 고친 뒤 확정한다.

// 회사별 카테고리 (SET-06 목록). 이관 확정은 이름이 아니라 id 로 보낸다.
export type CategoryOption = { id: string; name: string };

export type ImportRow = {
  row: number; // 엑셀 줄 번호
  name: string;
  stock: number | null; // 비었거나 숫자가 아니면 null (errors 에 사유)
  unit: string;
  // 정규식 + AI 로 뽑은 규격. 키는 parts.spec 과 같다(예: { thread: 'M8', length_mm: '20' })
  spec: Record<string, string>;
  // AI 제안. AI 가 실패하거나 확신이 없으면 null — 관리자가 직접 고른다
  suggested_category: (CategoryOption & { confidence: number }) | null;
  // 부품명+규격이 같은 기존 부품. 있으면 새로 만들지 않고 갱신한다 (같은 파일을 다시 올려도 중복 없음)
  existing_part_id: string | null;
  // 같은 부품일 수 있는 기존 부품 (F-MATCH-03, 최대 3개)
  duplicate_suspects: { part_id: string; name: string; reason: 'spec_exact' | 'name_similar' }[];
  errors: ImportRowError[]; // 있으면 이 줄은 등록할 수 없다
  warnings: ImportRowWarning[]; // 등록은 되지만 그 값은 반영되지 않는다
};

export type ImportPreview = {
  import_id: string;
  is_reimport: boolean; // 이 회사에 확정한 이관이 이미 있음
  rows: ImportRow[]; // 정렬: 오류 줄 → 확신도 낮은 줄 → 파일 순서 (서버가 정렬해서 준다)
  ai: { used: boolean; fallback: boolean; reason?: string | null };
};

// 재이관 기본값은 ignore(기존 부품 재고는 건드리지 않음), 첫 이관 기본값은 initial
export type ImportStockMode = 'initial' | 'ignore' | 'preview' | 'apply';

export type ConfirmImportInput = {
  // 보낸 줄만 반영한다. category_id·spec 을 비우면 서버가 SET-01 제안 값을 쓴다.
  // merge_with_part_id 를 주면 새로 만들지 않고 그 부품을 갱신한다(이름이 다르면 별칭으로 남김)
  rows: {
    row: number;
    category_id?: string;
    spec?: Record<string, string>;
    merge_with_part_id?: string;
  }[];
  stock_mode?: ImportStockMode;
};

export type ImportResult = {
  created: number;
  updated: number;
  adjust_movements: number; // 초기 재고·재이관 차이로 남긴 실사조정 기록 수
  stock_diffs: {
    row: number;
    part_id: string | null;
    name: string;
    ledger_stock: number;
    file_stock: number;
    diff: number;
  }[];
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
