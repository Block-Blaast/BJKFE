'use client';

import { TriangleAlert, CircleHelp, PackagePlus } from 'lucide-react';

import type { AdjustReason } from '@bjk/api/domain/audit';
import type { ChatCard } from '@bjk/api/types/chat';
import Button from '@bjk/ui/components/Button';

import { formatQty } from '@/utils/format';

import CountCard from './CountCard';

type ChatCardViewProps = {
  card: ChatCard;
  // 확인·취소가 끝났거나 만료돼 더 누를 수 없는 상태
  resolved: boolean;
  busy: boolean;
  onConfirm: (input: { partId?: string; adjustReason?: AdjustReason }) => void;
  onCancel: () => void;
};

const timeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const Expiry = ({ at }: { at: string }) => (
  <span className="text-label-sm text-text-secondary tabular-nums">
    {timeFormat.format(new Date(at))}까지 확인해 주세요
  </span>
);

// 확인 카드 4종 (F-CHAT-02) + 실사 카드 (F-CHAT-05). 확인 전에는 원장에 기록되지 않는다.
const ChatCardView = ({ card, resolved, busy, onConfirm, onCancel }: ChatCardViewProps) => {
  const disabled = resolved || busy;

  if (card.type === 'count') {
    return (
      <div className="flex flex-col gap-2">
        <CountCard
          card={card}
          disabled={disabled}
          onConfirm={(adjustReason) => onConfirm({ adjustReason })}
          onCancel={onCancel}
        />
        {!resolved ? <Expiry at={card.expires_at} /> : null}
      </div>
    );
  }

  if (card.type === 'unregistered') {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border-default bg-bg-surface p-5">
        <span className="flex items-center gap-1 text-label-md text-text-warning">
          <PackagePlus size={16} aria-hidden className="text-icon-warning" />
          미등록 부품
        </span>
        <p className="text-body-md text-text-body tabular-nums">
          {card.intent} · {card.part_text} · {formatQty(card.qty, card.unit)}
        </p>
        <p className="text-body-sm text-text-secondary">임시 기록 후 관리자에게 등록을 요청해요.</p>
      </div>
    );
  }

  if (card.type === 'select') {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-5">
        <span className="flex items-center gap-1 text-label-md text-text-heading">
          <CircleHelp size={16} aria-hidden className="text-icon-brand" />
          {card.intent} · {card.part_text} {formatQty(card.qty, card.unit)} — 어떤 부품인가요?
        </span>
        <div className="flex flex-col gap-2">
          {card.candidates.map((candidate) => (
            <Button
              key={candidate.part_id}
              variant="secondary"
              disabled={disabled}
              onClick={() => onConfirm({ partId: candidate.part_id })}
            >
              {candidate.part_name}
            </Button>
          ))}
          <Button variant="ghost" disabled={disabled} onClick={onCancel}>
            목록에 없음
          </Button>
        </div>
        {!resolved ? <Expiry at={card.expires_at} /> : null}
      </div>
    );
  }

  const isWarning = card.type === 'warning';
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border bg-bg-surface p-5 ${isWarning ? 'border-border-danger' : 'border-border-default'}`}
    >
      {isWarning ? (
        <span className="flex items-center gap-1 text-label-md text-text-danger">
          <TriangleAlert size={16} aria-hidden className="text-icon-danger" />
          평소보다 많아요 (지난 1회 최대 {formatQty(card.past_max, card.unit)})
        </span>
      ) : null}
      <dl className="grid grid-cols-3 gap-y-1 text-body-md tabular-nums">
        <dt className="text-text-secondary">구분</dt>
        <dd className="col-span-2 text-text-heading">{card.intent}</dd>
        <dt className="text-text-secondary">부품</dt>
        <dd className="col-span-2 text-text-heading">{card.part.part_name}</dd>
        <dt className="text-text-secondary">수량</dt>
        <dd className="col-span-2 text-text-heading">{formatQty(card.qty, card.unit)}</dd>
      </dl>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={disabled} onClick={() => onConfirm({})}>
          {isWarning ? '맞아요, 기록' : '확인'}
        </Button>
        <Button variant="secondary" disabled={disabled} onClick={onCancel}>
          취소
        </Button>
      </div>
      {!resolved ? <Expiry at={card.expires_at} /> : null}
    </div>
  );
};

export default ChatCardView;
