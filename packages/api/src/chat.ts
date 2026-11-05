import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { ChatInboxItem, ChatTurn, ConfirmPendingInput, SendChatInput } from './types/chat';

export const sendChatMessage = (input: SendChatInput) =>
  request<ChatTurn>(ENDPOINTS.chatMessages, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const confirmPending = (pendingId: string, input: ConfirmPendingInput = {}) =>
  request<ChatTurn>(ENDPOINTS.chatPendingConfirm(pendingId), {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const cancelPending = (pendingId: string) =>
  request<ChatTurn>(ENDPOINTS.chatPendingCancel(pendingId), { method: 'POST' });

// 재고 부족 제안을 검토로 올린다 (F-NOTI-01 stock_draft). 수량은 서버가 부품 지표로 정한다.
export const createStockDraft = (draftId: string) =>
  request<ChatTurn>(ENDPOINTS.chatStockDraft(draftId), { method: 'POST' });

export const getChatInbox = () => request<ChatInboxItem[]>(ENDPOINTS.chatInbox);

export const chatQueries = {
  inbox: () =>
    queryOptions({
      queryKey: queryKeys.chat.inbox(),
      queryFn: getChatInbox,
    }),
};
