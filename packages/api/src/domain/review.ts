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
