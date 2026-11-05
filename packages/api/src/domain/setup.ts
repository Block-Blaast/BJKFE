// 부품 엑셀 이관(F-SETUP-01·02, 백엔드 SET-01·02) 도메인 상수. 코드는 백엔드 값 그대로, 라벨은 화면용이다.

// 규격 키 — 백엔드 bjk_contracts SPEC_KEYS 와 같은 키. 모르는 키는 키 이름 그대로 보여 준다.
export const SPEC_KEY_LABEL: Record<string, string> = {
  bearing_no: '형번',
  shield: '실드',
  thread: '나사 지름',
  length_mm: '길이(mm)',
  type: '벨트 형',
  length: '벨트 길이',
  size: '호칭 크기',
  volume_l: '용량(L)',
};

// 줄 오류 — 있으면 그 줄은 확정할 수 없다 (백엔드 imports/parse.py)
export const IMPORT_ROW_ERROR_LABEL: Record<string, string> = {
  name_required: '부품 이름이 없어요',
  unit_required: '단위가 없어요',
  stock_required: '현재 재고가 없어요',
  stock_invalid: '현재 재고가 숫자가 아니에요',
  unit_price_invalid: '단가가 숫자가 아니에요',
  monthly_estimate_invalid: '월 사용 추정치가 숫자가 아니에요',
};

// 줄 경고 — 반영은 되지만 일부 값은 무시된다
export const IMPORT_ROW_WARNING_LABEL: Record<string, string> = {
  supplier_unknown: '등록되지 않은 공급사라 공급사·단가는 빼고 등록해요',
};

// 재이관 때 기존 부품의 재고를 어떻게 다룰지. initial 은 처음 이관 전용이라 화면에서 고르지 않는다.
// - ignore: 정보만 갱신하고 재고는 그대로
// - preview → apply: 장부와 파일 재고 차이를 먼저 보여 주고, 확인하면 차이만큼 조정 기록을 남긴다
export const STOCK_MODES = ['initial', 'ignore', 'preview', 'apply'] as const;
export type StockMode = (typeof STOCK_MODES)[number];
