// 오늘 활동 (W-01) — 임시 계약. 명세서에는 "오늘 활동"이라는 요소만 있고 형식이 없다.
// 백엔드 OpenAPI 가 나오면 생성된 타입으로 교체하고, 이 파일을 지운다.

export const ACTIVITY_KINDS = [
  'movement', // 입고·출고·실사조정 기록 (F-LEDGER-01)
  'review_created', // 검토 생성 — 직원 요청·재고 부족 초안·놓친 발주 (F-REVIEW)
  'review_decided', // 승인·반려 (F-APPROVAL)
  'audit_requested', // 실사 요청 (F-AUDIT-06)
  'audit_resolved', // 실사 응답으로 항목 종료 (F-CHAT-05)
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export type Activity = {
  id: string;
  kind: ActivityKind;
  text: string; // 사람이 읽는 한 줄 (서버가 만든다)
  at: string;
  href: string | null; // 관련 화면
};
