// 채팅 기록 — 임시 계약.
// 명세서 F-CHAT-01(추출 필드)·F-CHAT-02(확인 카드 4종)를 화면 단위로 옮긴 것이고, HTTP 형식은 명세서에 없다.
// 백엔드 OpenAPI 가 나오면 생성된 타입으로 교체하고, 이 파일을 지운다.
import type { AdjustReason } from '../domain/audit';

export const CHAT_INTENTS = ['출고', '입고', '실사', '조회', '발주요청', '기타'] as const;
export type ChatIntent = (typeof CHAT_INTENTS)[number];

export type ChatPartRef = {
  part_id: string;
  part_name: string;
  spec: string | null;
};

type PendingBase = {
  // 확인 전에는 서버의 pending_entries 에 있고 10분 뒤 만료된다 (F-CHAT-02)
  pending_id: string;
  intent: ChatIntent;
  qty: number;
  unit: string;
  expires_at: string;
};

export type ChatCard =
  // 실사 응답 (F-CHAT-05): 장부와 차이를 보여주고, 차이가 있으면 사유를 고르게 한다
  | (PendingBase & { type: 'count'; part: ChatPartRef; ledger_qty: number })
  // 백엔드 실사 응답(COUNT) 뒤 차이 사유 고르기 (AUD-04). 블라인드 실사라 차이는 답변 문장으로만 온다
  | { type: 'count_reason'; count_request_id: string }
  | (PendingBase & { type: 'confirm'; part: ChatPartRef })
  | (PendingBase & { type: 'select'; part_text: string; candidates: ChatPartRef[] })
  // past_max: 지난 1회 최대 수량. 백엔드는 주지 않아 없을 수 있다
  | (PendingBase & { type: 'warning'; part: ChatPartRef; past_max?: number })
  | { type: 'unregistered'; intent: ChatIntent; part_text: string; qty: number; unit: string }
  // [추가] 기록 직후 재고가 재주문점 이하면 띄우는 제안 — F-NOTI-01 의 "기록 중 재고 부족 초안" 입구.
  // 확인 카드(F-CHAT-02)와 달리 원장이 아니라 검토를 만들고, 만료가 없다. 발주 수량은 작업자가 아니라 검토가 정한다.
  | {
      type: 'reorder';
      draft_id: string;
      part: ChatPartRef;
      stock: number;
      reorder_point: number;
      unit: string;
    };

export type ChatTurn = {
  reply: string;
  card?: ChatCard;
  // 발주 요청이 검토로 넘어갔을 때 (F-CHAT-04)
  review_id?: string;
};

export type SendChatInput = {
  // 재전송해도 한 번만 기록되도록 프론트가 만든다 (F-LEDGER-01)
  client_message_id: string;
  text: string;
};

export type ConfirmPendingInput = {
  // 선택 카드에서 고른 부품. 확인·경고 카드는 비운다.
  part_id?: string;
  // 실사 카드에서 장부와 차이가 있을 때 고른 사유 (F-CHAT-05)
  adjust_reason?: AdjustReason;
};

// 사람이 아니라 시스템이 작업자에게 먼저 보내는 메시지 — 실사 요청(F-AUDIT-06) 등
export type ChatInboxItem = {
  id: string;
  text: string;
  created_at: string;
};

export type CountReasonInput = {
  reason: AdjustReason;
  note?: string;
};
