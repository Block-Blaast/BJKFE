// 실시간 이벤트 (백엔드 NOT-03 GET /api/v1/events, SSE). 형식은 BJK-AI-BE docs/api-spec/events.md 그대로다.

// 재고가 바뀐 모든 경로(채팅 확정·폼 입력, 원장 정정, 실사 조정, 엑셀 이관 확정, 부품 등록 초기 재고, 병합)에서
// 부품마다 온다. stock 은 병합 부품을 합산한 바뀐 뒤 재고. 입고·출고 구분과 수량은 없다 —
// 화면이 이전 재고와 비교해 계산한다. 재고가 그대로면(차이 0) 오지 않는다.
export type StockChangedEvent = {
  part_id: string;
  stock: number;
};

export type ReviewCreatedEvent = { review_id: string; entry: string };
export type ReviewProgressEvent = { review_id: string; step: string; at: string };
export type ReviewDecidedEvent = { review_id: string; status: string; action: string };
// 이름만 정의돼 있고 백엔드가 아직 발행하지 않는다
export type AuditFlaggedEvent = { audit_flag_id: string; part_id: string; level: string };

export type ServerEvent =
  | { type: 'stock.changed'; data: StockChangedEvent }
  | { type: 'review.created'; data: ReviewCreatedEvent }
  | { type: 'review.progress'; data: ReviewProgressEvent }
  | { type: 'review.decided'; data: ReviewDecidedEvent }
  | { type: 'audit.flagged'; data: AuditFlaggedEvent };
