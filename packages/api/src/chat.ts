import { queryOptions } from '@tanstack/react-query';

import { ApiError, itemsOf, request } from './client';
import type { AdjustReason } from './domain/audit';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type {
  ChatCard,
  ChatInboxItem,
  ChatIntent,
  ChatTurn,
  ConfirmPendingInput,
  CountReasonInput,
  SendChatInput,
} from './types/chat';

// ---- 백엔드 채팅 응답 (BJK-AI-BE docs/api-spec/chat.md CHAT-01·03·04) ----
// 백엔드는 AI(LLM)로 문장을 해석해 카드 여러 장(cards[])을 돌려준다. 화면은 한 턴에 카드 한 장(ChatTurn.card)을 그린다.
// 목업은 지금 화면 형식(ChatTurn)을 그대로 준다 — 응답에 cards 배열이 있으면 백엔드 형식으로 보고 바꾼다.
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
  // COUNT 로 실사 요청에 답했을 때만 온다 — 차이 사유(AUD-04)를 보낼 곳
  count_request_id?: string | null;
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

const NO_DIFF_REPLY = '장부와 같아요.';

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

const isBackendMessage = (raw: unknown): raw is BackendMessage =>
  typeof raw === 'object' && raw !== null && Array.isArray((raw as { cards?: unknown }).cards);

// 카드가 여러 장(품목 여러 개)이면 첫 장만 보이고, 나머지는 답변 문장으로 알린다. TODO: 여러 카드 그리기
const toTurn = (raw: BackendMessage): ChatTurn => {
  // 실사 응답에는 차이 여부가 없다. 차이가 0이면 서버가 요청을 바로 닫고 이 문장으로 답한다
  // (BJK-AI-BE audit/counts.py _diff_reply). 문장이 바뀌어도 사유 카드가 뜰 뿐이고, 보내면 409 안내로 끝난다
  if (raw.count_request_id) {
    const matched = raw.reply.startsWith(NO_DIFF_REPLY);
    return {
      reply: raw.reply,
      card: matched ? undefined : { type: 'count_reason', count_request_id: raw.count_request_id },
    };
  }
  const [first, ...rest] = raw.cards;
  const card = first ? toCard(first) : undefined;
  const fallback =
    first?.type === 'form' ? '\n문장을 이해하지 못했어요. 품목과 수량을 다시 적어 주세요.' : '';
  const more = rest.length ? `\n(나머지 ${rest.length}건은 하나씩 다시 보내 주세요.)` : '';
  return { reply: `${raw.reply}${fallback}${more}`, card };
};

export const sendChatMessage = async (input: SendChatInput): Promise<ChatTurn> => {
  const raw = await request<ChatTurn | BackendMessage>(ENDPOINTS.chatMessages, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return isBackendMessage(raw) ? toTurn(raw) : raw;
};

// 백엔드 확정 응답은 reply(+ 발주 요청이면 review_id)에 원장 정보가 붙어 온다. 화면은 답변·검토 id만 쓴다.
// 출고로 재주문점 아래가 되면 백엔드가 재고 부족 초안 검토를 스스로 만든다(triggered.draft_review_id) —
// 작업자가 누를 단계가 없어 답변에 알림만 붙인다. 시스템 초안은 작업자가 열 수 없어(404) 링크는 주지 않는다.
type ConfirmResponse = ChatTurn & { triggered?: { draft_review_id: string | null } };

export const confirmPending = async (
  pendingId: string,
  input: ConfirmPendingInput = {},
): Promise<ChatTurn> => {
  const raw = await request<ConfirmResponse>(ENDPOINTS.chatPendingConfirm(pendingId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const draft = raw.triggered?.draft_review_id
    ? '\n재고가 재주문점 아래로 내려가 발주 검토를 사장님께 올렸어요.'
    : '';
  return { reply: `${raw.reply}${draft}`, card: raw.card, review_id: raw.review_id };
};

// 백엔드 취소 응답은 { entry_id, status } 뿐이라 답변이 없다
export const cancelPending = async (pendingId: string): Promise<ChatTurn> => {
  const raw = await request<Partial<ChatTurn>>(ENDPOINTS.chatPendingCancel(pendingId), {
    method: 'POST',
  });
  return { reply: raw.reply ?? '취소했어요.', card: raw.card, review_id: raw.review_id };
};

// 재고 부족 제안을 검토로 올린다 (F-NOTI-01 stock_draft). 수량은 서버가 부품 지표로 정한다.
export const createStockDraft = (draftId: string) =>
  request<ChatTurn>(ENDPOINTS.chatStockDraft(draftId), { method: 'POST' });

// 백엔드는 { items }, 목업은 배열을 준다
export const getChatInbox = async () =>
  itemsOf(await request<ChatInboxItem[] | { items: ChatInboxItem[] }>(ENDPOINTS.chatInbox));

const REASON: Record<AdjustReason, string> = {
  분실: 'lost',
  '기록 누락': 'missing_record',
  파손: 'damaged',
  기타: 'other',
};

// 실사 차이 사유 (AUD-04). 차이가 없어 이미 닫힌 요청은 409 — 고를 사유가 없다는 뜻이라 안내만 한다
export const sendCountReason = async (
  countRequestId: string,
  input: CountReasonInput,
): Promise<ChatTurn> => {
  try {
    await request(ENDPOINTS.countRequest(countRequestId), {
      method: 'PATCH',
      body: JSON.stringify({ reason: REASON[input.reason], note: input.note }),
    });
    return { reply: `사유(${input.reason})를 기록하고 확인 요청을 닫았어요.` };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      return { reply: '장부와 차이가 없어 고를 사유가 없어요.' };
    }
    throw error;
  }
};

export const chatQueries = {
  inbox: () =>
    queryOptions({
      queryKey: queryKeys.chat.inbox(),
      queryFn: getChatInbox,
    }),
};
