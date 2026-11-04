// 기준 정보 (W-08, F-SETUP) — 임시 계약. 항목은 명세서 F-SETUP-01·02·04 표를 따랐고 HTTP 형식은 명세서에 없다.
// 백엔드 OpenAPI 가 나오면 생성된 타입으로 교체하고, 이 파일을 지운다.
import type { Category } from '../domain/part';

// ---- 부품 엑셀 이관 (F-SETUP-01·02) ----
// 엑셀은 서버가 읽고 AI 제안까지 붙여 미리보기로 돌려준다. 관리자는 틀린 것만 고친 뒤 확정한다.

export type ImportSuggestion = {
  spec: string | null; // 이름에서 뽑은 규격 (예: "M8 × 20")
  spec_fields: Record<string, string>; // 예: { 지름: 'M8', 길이: '20' }
  category: Category | null;
  confidence: number; // 0~1. 낮은 줄을 위로 올린다
};

export type ImportRow = {
  row: number; // 엑셀 줄 번호
  name: string;
  stock: number;
  unit: string;
  spec: string | null; // 엑셀에 적힌 규격
  supplier: { name: string; unit_price: number | null } | null;
  monthly_estimate: number | null; // 월 사용 추정치 (기록이 쌓이기 전 예측에 사용)
  location: string | null;
  suggestion: ImportSuggestion;
  // 부품명+규격이 이미 있으면 새로 만들지 않고 갱신한다 (같은 파일을 다시 올려도 중복 없음)
  action: 'create' | 'update';
  // [추가] 규격 일치 + 이름 유사 — 등록 뒤 병합 여부를 묻는다 (F-MATCH-03)
  duplicate_of: { part_id: string; name: string } | null;
};

export type ImportPreview = {
  id: string;
  file_name: string;
  rows: ImportRow[];
};

export type ConfirmImportInput = {
  rows: { row: number; spec: string | null; category: Category | null }[];
};

export type ImportResult = {
  created: number;
  updated: number;
  merge_candidates: number; // 숨은 재고(W-07)에서 병합 여부를 고른다
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
