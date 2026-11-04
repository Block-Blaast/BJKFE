'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SendHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@bjk/api/client';
import { cancelPending, chatQueries, confirmPending, sendChatMessage } from '@bjk/api/chat';
import type { AdjustReason } from '@bjk/api/domain/audit';
import { queryKeys } from '@bjk/api/queryKeys';
import type { ChatCard, ChatTurn } from '@bjk/api/types/chat';

import ChatCardView from './ChatCardView';

type Message =
  | {
      id: string;
      role: 'user';
      text: string;
      // 실패한 메시지는 같은 client_message_id 로 다시 보낸다 — 서버가 중복 기록을 막는다
      status: 'sending' | 'sent' | 'failed';
    }
  | {
      id: string;
      role: 'bot';
      text: string;
      card?: ChatCard;
      cardResolved?: boolean;
      reviewId?: string;
    };

const QUICK_PHRASES = [
  { label: '출고', text: '출고 ' },
  { label: '입고', text: '입고 ' },
  { label: '몇 개 있어?', text: ' 몇 개 있어?' },
];

const GREETING: Message = {
  id: 'greeting',
  role: 'bot',
  text: '기록, 조회, 발주 요청을 도와드려요.\n예: "V벨트 2개 씀", "볼트 몇 개 있어?", "V벨트 30개 시켜주세요"',
};

const errorText = (error: unknown) => {
  if (error instanceof ApiError) {
    const body = error.body as { message?: string } | undefined;
    if (body?.message) return body.message;
  }
  return '처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
};

// 채팅 기록 (M-02, F-CHAT-01~05)
// TODO: LLM 오류가 반복되면 폼 입력으로 전환 (F-CHAT-01), 실사 요청 메시지 (F-CHAT-05)
const ChatThread = () => {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const queryClient = useQueryClient();
  // 시스템이 먼저 보낸 메시지(실사 요청 등)는 인사말 바로 다음에 보여준다 (F-AUDIT-06)
  const inbox = useQuery(chatQueries.inbox());
  const inboxMessages: Message[] = (inbox.data ?? []).map((item) => ({
    id: item.id,
    role: 'bot',
    text: item.text,
  }));
  const shown = [messages[0], ...inboxMessages, ...messages.slice(1)];
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [shown.length]);

  const appendBotTurn = (turn: ChatTurn) =>
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'bot',
        text: turn.reply,
        card: turn.card,
        reviewId: turn.review_id,
      },
    ]);

  const setUserStatus = (id: string, status: 'sending' | 'sent' | 'failed') =>
    setMessages((prev) =>
      prev.map((m) => (m.id === id && m.role === 'user' ? { ...m, status } : m)),
    );

  const resolveCard = (messageId: string) =>
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId && m.role === 'bot' ? { ...m, cardResolved: true } : m)),
    );

  const send = useMutation({ mutationFn: sendChatMessage });
  const confirm = useMutation({
    mutationFn: ({
      pendingId,
      partId,
      adjustReason,
    }: {
      pendingId: string;
      partId?: string;
      adjustReason?: AdjustReason;
    }) => confirmPending(pendingId, { part_id: partId, adjust_reason: adjustReason }),
    // 재고·원장이 바뀌고, 실사조정이면 장부 검증 항목이 닫히고 브리핑·수신함 숫자가 바뀐다
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.audits.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.briefing.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.inbox() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.parts.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
      ]),
  });
  const cancel = useMutation({ mutationFn: cancelPending });

  const deliver = (id: string, text: string) => {
    setUserStatus(id, 'sending');
    send.mutate(
      { client_message_id: id, text },
      {
        onSuccess: (turn) => {
          setUserStatus(id, 'sent');
          appendBotTurn(turn);
        },
        onError: () => setUserStatus(id, 'failed'),
      },
    );
  };

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { id, role: 'user', text, status: 'sending' }]);
    setDraft('');
    deliver(id, text);
  };

  const handleConfirm = (
    messageId: string,
    card: ChatCard,
    input: { partId?: string; adjustReason?: AdjustReason },
  ) => {
    if (card.type === 'unregistered') return;
    confirm.mutate(
      { pendingId: card.pending_id, ...input },
      {
        onSuccess: (turn) => {
          resolveCard(messageId);
          appendBotTurn(turn);
        },
        onError: (error) => {
          // 410: 10분이 지나 서버에서 만료됨 — 카드를 닫고 다시 입력하게 한다
          if (error instanceof ApiError && error.status === 410) resolveCard(messageId);
          appendBotTurn({ reply: errorText(error) });
        },
      },
    );
  };

  const handleCancel = (messageId: string, card: ChatCard) => {
    if (card.type === 'unregistered') return;
    cancel.mutate(card.pending_id, {
      onSuccess: (turn) => {
        resolveCard(messageId);
        appendBotTurn(turn);
      },
      onError: (error) => appendBotTurn({ reply: errorText(error) }),
    });
  };

  const insertPhrase = (text: string) => {
    setDraft((prev) => (text.startsWith(' ') ? `${prev.trimEnd()}${text}` : `${text}${prev}`));
    inputRef.current?.focus();
  };

  const busy = confirm.isPending || cancel.isPending;

  return (
    <div className="-mx-4 -my-6 flex min-h-0 flex-1 flex-col">
      <ol className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {shown.map((message) =>
          message.role === 'user' ? (
            <li key={message.id} className="flex flex-col items-end gap-1">
              <p className="max-w-4/5 rounded-md bg-bg-brand px-4 py-3 text-body-md whitespace-pre-line text-text-on-brand">
                {message.text}
              </p>
              {message.status === 'sending' ? (
                <span className="text-label-sm text-text-secondary">보내는 중…</span>
              ) : null}
              {message.status === 'failed' ? (
                <button
                  type="button"
                  className="flex h-11 items-center text-label-sm text-text-danger"
                  onClick={() => deliver(message.id, message.text)}
                >
                  보내지 못했어요 · 다시 보내기
                </button>
              ) : null}
            </li>
          ) : (
            <li key={message.id} className="flex flex-col items-start gap-2">
              <p className="max-w-4/5 rounded-md border border-border-default bg-bg-surface px-4 py-3 text-body-md whitespace-pre-line text-text-body">
                {message.text}
              </p>
              {message.card ? (
                <div className="w-full max-w-4/5">
                  <ChatCardView
                    card={message.card}
                    resolved={Boolean(message.cardResolved)}
                    busy={busy}
                    onConfirm={(input) => handleConfirm(message.id, message.card!, input)}
                    onCancel={() => handleCancel(message.id, message.card!)}
                  />
                </div>
              ) : null}
              {message.reviewId ? (
                <Link
                  href={`/m/reviews/${message.reviewId}`}
                  className="flex h-11 items-center text-label-md text-text-brand"
                >
                  검토 결과 보기
                </Link>
              ) : null}
            </li>
          ),
        )}
        <li ref={endRef} aria-hidden />
      </ol>

      <div className="flex shrink-0 flex-col gap-2 border-t border-border-default bg-bg-surface px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {QUICK_PHRASES.map(({ label, text }) => (
            <button
              key={label}
              type="button"
              className="h-11 shrink-0 rounded-md bg-bg-brand-subtle px-4 text-label-md text-text-brand active:bg-bg-brand-subtle-hover"
              onClick={() => insertPhrase(text)}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            메시지
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="예: V벨트 2개 씀"
            autoComplete="off"
            enterKeyHint="send"
            className="h-12 min-w-0 flex-1 rounded-md border border-border-strong bg-bg-surface px-4 text-body-md text-text-body outline-none placeholder:text-text-placeholder focus:border-border-brand focus:ring-1 focus:ring-border-brand focus:ring-inset"
          />
          <button
            type="submit"
            aria-label="보내기"
            disabled={!draft.trim()}
            className="flex size-12 shrink-0 items-center justify-center rounded-md bg-bg-brand text-text-on-brand disabled:bg-bg-disabled disabled:text-text-disabled"
          >
            <SendHorizontal size={20} aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatThread;
