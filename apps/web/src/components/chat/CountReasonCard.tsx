'use client';

import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';

import { ADJUST_REASONS, type AdjustReason } from '@bjk/api/domain/audit';
import Button from '@bjk/ui/components/Button';

type CountReasonCardProps = {
  disabled: boolean;
  onConfirm: (adjustReason: AdjustReason) => void;
  onCancel: () => void;
};

// 백엔드 실사 응답 뒤 차이 사유 (AUD-04). 블라인드 실사라 기록 수량은 보여 주지 않고, 차이는 위 답변 문장에만 있다.
// 차이가 없었다면 서버가 이미 닫아 둬 사유를 보내도 안내만 돌아온다.
const CountReasonCard = ({ disabled, onConfirm, onCancel }: CountReasonCardProps) => {
  const [reason, setReason] = useState<AdjustReason | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-5">
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="flex items-center gap-1 pb-2 text-label-md text-text-heading">
          <ClipboardCheck size={16} aria-hidden className="text-icon-brand" />
          차이가 있다면 사유를 골라 주세요
        </legend>
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
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={disabled || !reason}
          onClick={() => reason && onConfirm(reason)}
        >
          사유 기록
        </Button>
        <Button variant="secondary" disabled={disabled} onClick={onCancel}>
          나중에
        </Button>
      </div>
    </div>
  );
};

export default CountReasonCard;
