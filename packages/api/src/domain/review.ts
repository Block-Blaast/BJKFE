// 발주 검토(F-REVIEW) 도메인 상수. 문자열 값은 명세서 F-REVIEW-07 출력 예시를 따른다.
// 백엔드 OpenAPI 가 나오면 그 enum 과 대조해 맞춘다. 화면은 이 상수만 참조해서 바뀌어도 고칠 곳이 한 군데다.

export const VERDICTS = ['보류', '수정 권고', '적정'] as const;
export type Verdict = (typeof VERDICTS)[number];

// 판정과 별개로 붙는 표시 (F-REVIEW-06)
export const REVIEW_FLAGS = ['긴급', '주의'] as const;
export type ReviewFlag = (typeof REVIEW_FLAGS)[number];

export const CHECK_LEVELS = ['긴급', '경고', '정보'] as const;
export type CheckLevel = (typeof CHECK_LEVELS)[number];

// 의견서·근거 표는 긴급 → 경고 → 정보 순으로 보여준다 (F-REVIEW-08)
export const CHECK_LEVEL_ORDER: Record<CheckLevel, number> = { 긴급: 0, 경고: 1, 정보: 2 };

export const CHECKS = {
  'C-01': { name: '수량 과다', level: '경고' },
  'C-02': { name: '장기 재고화', level: '경고' },
  'C-03': { name: '중복 발주', level: '경고' },
  'C-04': { name: '숨은 재고', level: '경고' },
  'C-05': { name: '단가 이상', level: '경고' },
  'C-06': { name: '더 싼 공급사', level: '정보' },
  'C-07': { name: '수량 부족', level: '긴급' },
  'C-08': { name: '마감 임박', level: '긴급' },
  'C-09': { name: '외부 리스크', level: '정보' },
} as const satisfies Record<string, { name: string; level: CheckLevel }>;
export type CheckCode = keyof typeof CHECKS;

// 검토 요청의 상태 전이 (F-APPROVAL-02)
export const REVIEW_STATUSES = [
  '검토중',
  '보류',
  '검토완료',
  '발주됨',
  '부분입고',
  '입고완료',
  '종료',
  '만료',
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// 승인 화면의 행동 (F-APPROVAL-01)
export const APPROVAL_ACTIONS = {
  approveProposal: '수정안 승인',
  approveOriginal: '원안 승인',
  editAndApprove: '직접 수정 후 승인',
  acceptNoOrder: '발주 불필요 수용',
  reject: '반려',
} as const;
export type ApprovalAction = keyof typeof APPROVAL_ACTIONS;

// 근거 숫자의 기호 (F-REVIEW-02). 의견서·근거 표에서 기호 옆에 뜻을 붙여 보여준다.
export type FactKind = 'qty' | 'won' | 'date' | 'days' | 'months' | 'number' | 'text';

export const FACTS: Record<string, { label: string; kind: FactKind }> = {
  Q: { label: '요청 수량', kind: 'qty' },
  S: { label: '현재 재고', kind: 'qty' },
  O: { label: '입고 예정', kind: 'qty' },
  H: { label: '숨은 재고', kind: 'qty' },
  m: { label: '월 소모량', kind: 'qty' },
  F: { label: '확정 필요량(정비)', kind: 'qty' },
  D95: { label: '기간 필요량 상위 95%', kind: 'qty' },
  D99: { label: '기간 필요량 상위 99%', kind: 'qty' },
  R: { label: '권장 발주량', kind: 'qty' },
  reorder_point: { label: '재주문점', kind: 'qty' },
  MOQ: { label: '최소 주문 수량', kind: 'qty' },
  LT50: { label: '납기 보통', kind: 'days' },
  LT90: { label: '납기 늦을 때', kind: 'days' },
  months: { label: '소진까지 걸리는 기간', kind: 'months' },
  t_out: { label: '소진 예상일', kind: 'date' },
  t_deadline: { label: '발주 마감일', kind: 'date' },
  eta: { label: '입고 예정일', kind: 'date' },
  L: { label: '결품 시 예상 손실', kind: 'won' },
  unit_price: { label: '요청 단가', kind: 'won' },
  p_mean: { label: '최근 평균 단가', kind: 'won' },
  p_sd: { label: '단가 표준편차', kind: 'won' },
  n: { label: '최근 구매 건수', kind: 'number' },
  alt_supplier: { label: '더 싼 공급사', kind: 'text' },
  alt_unit_price: { label: '그 공급사 단가', kind: 'won' },
  holiday: { label: '납기 중 연휴', kind: 'text' },
  // 백엔드 검토 엔진(bjk_review checks)이 근거로 주는 키
  H_c: { label: '확인된 숨은 재고', kind: 'qty' },
  H_u: { label: '확인 전 숨은 재고', kind: 'qty' },
  P: { label: '다른 열린 요청', kind: 'qty' },
  F_12m: { label: '12개월 확정 필요량', kind: 'qty' },
  sigma: { label: '단가 표준편차', kind: 'won' },
  supplier: { label: '공급사', kind: 'text' },
  cause: { label: '원인', kind: 'text' },
  note: { label: '참고', kind: 'text' },
  deadline: { label: '발주 마감일', kind: 'date' },
  days_left: { label: '마감까지 남은 날', kind: 'days' },
  t_need: { label: '소진 예상일', kind: 'date' },
  r_lead: { label: '납기 위험도', kind: 'number' },
  r_price: { label: '단가 위험도', kind: 'number' },
};

// 같은 키라도 체크마다 뜻이 다르면 여기서 이름을 바꾼다 — C-06 의 단가·납기는 더 싼 공급사 값이다
export const CHECK_FACT_LABELS: Partial<Record<CheckCode, Record<string, string>>> = {
  'C-06': { unit_price: '그 공급사 단가', LT90: '그 공급사 납기(늦을 때)' },
};

// 글자 값 근거(원인·참고)의 화면 문구. 여러 원인은 쉼표로 이어 온다
export const FACT_TEXT: Record<string, string> = {
  deadline: '발주 마감 임박',
  supplier_lead: '요청 공급사 납기 부족',
  no_recent_usage: '최근 사용 기록 없음',
};
