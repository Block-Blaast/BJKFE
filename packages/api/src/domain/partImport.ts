// 부품 엑셀 이관 도메인 상수 (F-SETUP-01·02, 백엔드 SET-01). 코드는 BJK-AI-BE docs/api-spec/imports.md 그대로다.

// 서버가 읽는 파일 형식. .xls(옛 엑셀)는 서버가 읽지 못해 400 이 난다.
export const IMPORT_FILE_ACCEPT = '.xlsx,.csv';

// 확정할 수 없는 줄의 사유
export const IMPORT_ROW_ERRORS = {
  name_required: '부품 이름이 비어 있어요',
  unit_required: '단위가 비어 있어요',
  stock_required: '현재 재고가 비어 있어요',
  stock_invalid: '현재 재고가 숫자가 아니에요',
  unit_price_invalid: '단가가 숫자가 아니에요',
  monthly_estimate_invalid: '월 사용 추정치가 숫자가 아니에요',
} as const;
export type ImportRowError = keyof typeof IMPORT_ROW_ERRORS;

// 확정은 되지만 그 값은 반영되지 않는 줄의 사유
export const IMPORT_ROW_WARNINGS = {
  supplier_unknown: '등록되지 않은 공급사라 공급사·단가는 넣지 않아요',
} as const;
export type ImportRowWarning = keyof typeof IMPORT_ROW_WARNINGS;

// 규격 키(parts.spec) → 화면 라벨. 서버 정규식(domain/matching.py)이 뽑는 키다.
// AI 가 다른 키를 더할 수 있어, 없는 키는 키 이름을 그대로 보여준다.
export const SPEC_KEY_LABELS: Record<string, string> = {
  bearing_no: '형번',
  shield: '실드',
  thread: '나사',
  length_mm: '길이(mm)',
  type: '형',
  length: '길이',
  size: '호칭',
  volume_l: '용량(L)',
};
