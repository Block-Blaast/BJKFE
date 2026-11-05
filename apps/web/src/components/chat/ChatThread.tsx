'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SendHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@bjk/api/client';
import {
  cancelPending,
  chatQueries,
  confirmPending,
  createStockDraft,
  sendChatMessage,
} from '@bjk/api/chat';
import type { AdjustReason } from '@bjk/api/domain/audit';
import { queryKeys } from '@bjk/api/queryKeys';
import type { ChatCard, ChatTurn } from '@bjk/api/types/chat';

import { useEquipment } from '@/hooks/setup/useSetup';

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
  // 설비를 고르면 그 설비가 쓰는 부품이 칩으로 내려온다 ([추가] 입력 보조).
  // 현장에서는 부품명이 아니라 "어느 기계를 손본다"가 먼저라서, 문장을 대신 써 준다.
  const equipment = useEquipment();
  const [pickedEquipment, setPickedEquipment] = useState<string | null>(null);
  const picked = equipment.data?.find((e) => e.id === pickedEquipment) ?? null;
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
  // 재고 부족 제안 → 검토 생성. 원장은 건드리지 않으므로 재고 쿼리는 무효화하지 않는다.
  // 결정 대기 검토의 수정안은 3D 창고의 "발주하면" 예측에 들어가므로 twin 은 무효화한다.
  const raise = useMutation({
    mutationFn: createStockDraft,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.briefing.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.twin.all }),
      ]),
  });
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
    // 재고·원장이 바뀌고, 실사조정이면 장부 검증 항목이 닫히고 브리핑·수신함 숫자가 바뀐다.
    // 입고면 발주 검토가 부분입고·입고완료로 넘어가 검토함·리포트·흐름 띠 숫자도 바뀐다.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.audits.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.briefing.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.inbox() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.parts.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.twin.all }),
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
    // 재고 부족 제안은 원장이 아니라 검토를 만든다 (F-NOTI-01). 수량은 서버가 정한다.
    if (card.type === 'reorder') {
      raise.mutate(card.draft_id, {
        onSuccess: (turn) => {
          resolveCard(messageId);
          appendBotTurn(turn);
        },
        onError: (error) => appendBotTurn({ reply: errorText(error) }),
      });
      return;
    }
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
    if (card.type === 'reorder') {
      resolveCard(messageId);
      appendBotTurn({ reply: '알겠어요. 다음에 기록할 때 다시 알려드릴게요.' });
      return;
    }
    cancel.mutate(card.pending_id, {
      onSuccess: (turn) => {
        resolveCard(messageId);
        appendBotTurn(turn);
      },
      onError: (error) => appendBotTurn({ reply: errorText(error) }),
    });
  };

  // 칩은 문장을 채워 줄 뿐이다 — 보내면 확인 카드(F-CHAT-02)를 그대로 거친다.
  const insertPart = (name: string, qty: number, unit: string) => {
    setDraft(`${name} ${qty}${unit} 씀`);
    setPickedEquipment(null);
    inputRef.current?.focus();
  };

  const busy = confirm.isPending || cancel.isPending || raise.isPending;

  return (
    <div className="-mx-4 -my-6 flex min-h-0 flex-1 flex-col">
      <ol className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {shown.map((message) =>
          message.role === 'user' ? (
            <li key={message.id} className="flex flex-col items-end gap-1">
              <p className="max-w-4/5 rounded-xl rounded-br-md bg-bg-brand px-4 py-3 text-body-md whitespace-pre-line text-text-on-brand">
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
              <p className="max-w-4/5 rounded-xl rounded-bl-md bg-bg-surface px-4 py-3 text-body-md whitespace-pre-line text-text-body shadow-card">
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
        {equipment.data?.length ? (
          <div className="flex gap-2 overflow-x-auto">
            {equipment.data.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={pickedEquipment === item.id}
                className={`h-11 shrink-0 rounded-full px-4 text-label-md ${
                  pickedEquipment === item.id
                    ? 'bg-bg-inverse text-text-on-inverse'
                    : 'bg-bg-subtle text-text-body'
                }`}
                onClick={() => setPickedEquipment((prev) => (prev === item.id ? null : item.id))}
              >
                {item.name}
              </button>
            ))}
          </div>
        ) : null}
        {/* 설비를 고르면 그 설비의 정비 부품을 버튼으로 보여 준다. 고르지 않았을 때는 버튼 줄을 두지 않는다 */}
        {picked ? (
          <div className="flex gap-2 overflow-x-auto">
            {picked.parts.map((part) => (
              <button
                key={part.part_id}
                type="button"
                className="h-11 shrink-0 rounded-full bg-bg-brand-subtle px-4 text-label-md text-text-brand active:bg-bg-brand-subtle-hover"
                onClick={() => insertPart(part.part_name, part.qty, part.unit)}
              >
                {part.part_name} {part.qty}
                {part.unit}
              </button>
            ))}
          </div>
        ) : null}
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
            className="h-12 min-w-0 flex-1 rounded-full border border-border-strong bg-bg-surface px-5 text-body-md text-text-body outline-none placeholder:text-text-placeholder focus:border-border-brand focus:ring-1 focus:ring-border-brand focus:ring-inset"
          />
          <button
            type="submit"
            aria-label="보내기"
            disabled={!draft.trim()}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-bg-brand text-text-on-brand disabled:bg-bg-disabled disabled:text-text-disabled"
          >
            <SendHorizontal size={20} aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatThread;
