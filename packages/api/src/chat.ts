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

export const getChatInbox = () => request<ChatInboxItem[]>(ENDPOINTS.chatInbox);

export const chatQueries = {
  inbox: () =>
    queryOptions({
      queryKey: queryKeys.chat.inbox(),
      queryFn: getChatInbox,
    }),
};
