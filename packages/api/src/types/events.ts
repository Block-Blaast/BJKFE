// 실시간 이벤트 (백엔드 NOT-03 GET /api/v1/events, SSE). 형식은 BJK-AI-BE docs/api-spec/events.md 그대로다.

// 원장 기록(채팅 확정·폼 입력) 뒤 바뀐 재고. 입고·출고 구분과 수량은 없다 —
// 화면이 이전 재고와 비교해 계산한다. 원장 정정·실사 조정·엑셀 이관·부품 등록 초기 재고는 이 이벤트를 보내지 않는다.
export type StockChangedEvent = {
  part_id: string;
  stock: number;
};
