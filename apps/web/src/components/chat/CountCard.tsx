'use client';

import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';

import { ADJUST_REASONS, type AdjustReason } from '@bjk/api/domain/audit';
import type { ChatCard } from '@bjk/api/types/chat';
import Button from '@bjk/ui/components/Button';

import { formatQty } from '@/utils/format';

type CountCardProps = {
  card: Extract<ChatCard, { type: 'count' }>;
  disabled: boolean;
  onConfirm: (adjustReason?: AdjustReason) => void;
  onCancel: () => void;
};

// 실사 응답 (F-CHAT-05). 장부와 차이를 보여주고, 차이가 있으면 사유를 골라야 기록된다.
const CountCard = ({ card, disabled, onConfirm, onCancel }: CountCardProps) => {
  const [reason, setReason] = useState<AdjustReason | null>(null);
  const diff = card.qty - card.ledger_qty;
  const same = diff === 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-5">
      <span className="flex items-center gap-1 text-label-md text-text-heading">
        <ClipboardCheck size={16} aria-hidden className="text-icon-brand" />
        실사 · {card.part.part_name}
      </span>
      <dl className="grid grid-cols-3 gap-y-1 text-body-md tabular-nums">
        <dt className="text-text-secondary">장부</dt>
        <dd className="col-span-2 text-text-heading">{formatQty(card.ledger_qty, card.unit)}</dd>
        <dt className="text-text-secondary">실제</dt>
        <dd className="col-span-2 text-text-heading">{formatQty(card.qty, card.unit)}</dd>
        <dt className="text-text-secondary">차이</dt>
        <dd className={`col-span-2 ${same ? 'text-text-success' : 'text-text-danger'}`}>
          {same ? '없음' : `${diff > 0 ? '+' : ''}${formatQty(diff, card.unit)}`}
        </dd>
      </dl>

      {same ? null : (
        <fieldset className="flex flex-col gap-2" disabled={disabled}>
          <legend className="pb-2 text-label-md text-text-heading">차이 사유</legend>
          <div className="grid grid-cols-2 gap-2">
            {ADJUST_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
                className={`h-11 rounded-full border text-label-md ${reason === r ? 'border-border-brand bg-bg-brand-subtle text-text-brand' : 'border-border-strong bg-bg-surface text-text-body'} disabled:text-text-disabled`}
              >
                {r}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={disabled || (!same && !reason)}
          onClick={() => onConfirm(same ? undefined : (reason ?? undefined))}
        >
          {same ? '이상 없음 기록' : '실사조정 기록'}
        </Button>
        <Button variant="secondary" disabled={disabled} onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
};

export default CountCard;
