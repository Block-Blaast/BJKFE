import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type {
  ChatCard,
  ChatInboxItem,
  ChatIntent,
  ChatTurn,
  ConfirmPendingInput,
  SendChatInput,
} from './types/chat';

// ---- 백엔드 채팅 응답 (BJK-AI-BE docs/api-spec/chat.md CHAT-01·03·04) ----
// 백엔드는 AI(LLM)로 문장을 해석해 카드 여러 장(cards[])을 돌려준다. 화면은 한 턴에 카드 한 장(ChatTurn.card)을 그린다.
type BackendIntent =
  'OUT' | 'IN' | 'QUERY' | 'OTHER' | 'MAINTENANCE_DONE' | 'COUNT' | 'PURCHASE_REQUEST';

type BackendCard = {
  type: 'confirm' | 'select' | 'warning' | 'unregistered' | 'form';
  entry_id: string;
  intent: BackendIntent;
  part_text: string | null;
  qty: number | null;
  part_id: string | null;
  name: string | null;
  unit: string | null;
  candidates: { part_id: string; name: string; stock: number }[];
  expires_at: string;
};

type BackendMessage = {
  intent: BackendIntent;
  reply: string;
  cards: BackendCard[];
};

const INTENT_LABEL: Record<BackendIntent, ChatIntent> = {
  OUT: '출고',
  IN: '입고',
  QUERY: '조회',
  OTHER: '기타',
  MAINTENANCE_DONE: '기타',
  COUNT: '실사',
  PURCHASE_REQUEST: '발주요청',
};

const DEFAULT_UNIT = '개';

const toCard = (c: BackendCard): ChatCard | undefined => {
  const base = {
    pending_id: c.entry_id,
    intent: INTENT_LABEL[c.intent],
    qty: c.qty ?? 0,
    unit: c.unit ?? DEFAULT_UNIT,
    expires_at: c.expires_at,
  };
  const part = { part_id: c.part_id ?? '', part_name: c.name ?? c.part_text ?? '', spec: null };
  switch (c.type) {
    case 'confirm':
      return { ...base, type: 'confirm', part };
    // 백엔드는 지난 1회 최대 수량을 주지 않는다 — 화면은 수치 없이 "평소보다 많아요"만 보인다
    case 'warning':
      return { ...base, type: 'warning', part };
    case 'select':
      return {
        ...base,
        type: 'select',
        part_text: c.part_text ?? '',
        candidates: c.candidates.map((x) => ({
          part_id: x.part_id,
          part_name: x.name,
          spec: null,
        })),
      };
    case 'unregistered':
      return {
        type: 'unregistered',
        intent: INTENT_LABEL[c.intent],
        part_text: c.part_text ?? '',
        qty: c.qty ?? 0,
        unit: c.unit ?? DEFAULT_UNIT,
      };
    // form: AI 해석 실패 — 폼 입력 화면이 아직 없어 카드 없이 답변만 보여 준다. TODO(F-CHAT-01) 폼 입력(CHAT-05)
    default:
      return undefined;
  }
};

// 카드가 여러 장(품목 여러 개)이면 첫 장만 보이고, 나머지는 답변 문장으로 알린다. TODO: 여러 카드 그리기
const toTurn = (raw: BackendMessage): ChatTurn => {
  const [first, ...rest] = raw.cards;
  const card = first ? toCard(first) : undefined;
  const fallback =
    first?.type === 'form' ? '\n문장을 이해하지 못했어요. 품목과 수량을 다시 적어 주세요.' : '';
  const more = rest.length ? `\n(나머지 ${rest.length}건은 하나씩 다시 보내 주세요.)` : '';
  return { reply: `${raw.reply}${fallback}${more}`, card };
};

export const sendChatMessage = async (input: SendChatInput): Promise<ChatTurn> => {
  const raw = await request<BackendMessage>(ENDPOINTS.chatMessages, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return toTurn(raw);
};

// 백엔드 확정 응답은 reply(+ 발주 요청이면 review_id)에 원장 정보가 붙어 온다. 화면은 답변·검토 id만 쓴다
export const confirmPending = async (
  pendingId: string,
  input: ConfirmPendingInput = {},
): Promise<ChatTurn> => {
  const raw = await request<ChatTurn>(ENDPOINTS.chatPendingConfirm(pendingId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return { reply: raw.reply, card: raw.card, review_id: raw.review_id };
};

// 백엔드 취소 응답은 { entry_id, status } 뿐이라 답변이 없다
export const cancelPending = async (pendingId: string): Promise<ChatTurn> => {
  const raw = await request<Partial<ChatTurn>>(ENDPOINTS.chatPendingCancel(pendingId), {
    method: 'POST',
  });
  return { reply: raw.reply ?? '취소했어요.', card: raw.card, review_id: raw.review_id };
};

// 시스템이 먼저 보낸 메시지 (명세 밖, 백엔드 PR #278) — 응답을 기다리는 내 실사 요청. 블라인드 실사라 장부 수량은 없다
export const getChatInbox = async () =>
  (await request<{ items: ChatInboxItem[] }>(ENDPOINTS.chatInbox)).items;

export const chatQueries = {
  inbox: () =>
    queryOptions({
      queryKey: queryKeys.chat.inbox(),
      queryFn: getChatInbox,
      retry: false,
    }),
};
