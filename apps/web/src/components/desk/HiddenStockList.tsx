'use client';

import { Combine } from 'lucide-react';
import { useState } from 'react';

import type { MergeCandidate } from '@bjk/api/types/audit';
import Button from '@bjk/ui/components/Button';

import {
  useDismissMerge,
  useMergeCandidates,
  useMergeParts,
} from '@/hooks/audit/useMergeCandidates';
import { apiErrorMessage } from '@/utils/apiError';
import { formatQty } from '@/utils/format';

const CandidateCard = ({ candidate }: { candidate: MergeCandidate }) => {
  const merge = useMergeParts();
  const dismiss = useDismissMerge();
  const [primaryId, setPrimaryId] = useState<string>(candidate.parts[0].id);
  const [confirming, setConfirming] = useState(false);
  const busy = merge.isPending || dismiss.isPending;
  const error = merge.error ?? dismiss.error;
  const total = candidate.parts[0].stock + candidate.parts[1].stock;
  const unit = candidate.parts[0].unit;

  return (
    <li className="flex flex-col gap-4 rounded-md bg-bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-label-lg text-text-heading">규격 {candidate.spec}</span>
        <span className="text-body-sm text-text-secondary">{candidate.category}</span>
      </div>

      <fieldset className="grid grid-cols-2 gap-3" disabled={candidate.status !== 'open' || busy}>
        <legend className="sr-only">대표 부품 선택</legend>
        {candidate.parts.map((part) => {
          const isPrimary =
            candidate.status === 'merged'
              ? candidate.primary_part_id === part.id
              : primaryId === part.id;
          return (
            <label
              key={part.id}
              className={`flex cursor-pointer flex-col gap-1 rounded-md border p-4 ${isPrimary ? 'border-border-brand bg-bg-brand-subtle' : 'border-border-default'}`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`primary-${candidate.id}`}
                  value={part.id}
                  checked={isPrimary}
                  onChange={() => setPrimaryId(part.id)}
                  className="accent-bg-brand"
                />
                <span className="text-label-md text-text-heading">{part.name}</span>
              </span>
              <span className="pl-6 text-body-sm text-text-body tabular-nums">
                재고 {formatQty(part.stock, part.unit)}
              </span>
            </label>
          );
        })}
      </fieldset>

      {candidate.status === 'merged' ? (
        <p className="text-body-sm text-text-success tabular-nums">
          병합했어요. 재고는 합쳐서 {formatQty(total, unit)}로 계산돼요.
        </p>
      ) : candidate.status === 'dismissed' ? (
        <p className="text-body-sm text-text-secondary">다른 부품으로 표시했어요.</p>
      ) : confirming ? (
        <div className="flex flex-col gap-3 rounded-md bg-bg-subtle p-4">
          <p className="text-body-md text-text-body">
            선택한 부품을 대표로 병합할까요? 원장 기록은 그대로 두고, 재고는 합쳐서{' '}
            <strong className="text-label-lg tabular-nums">{formatQty(total, unit)}</strong>로
            계산해요. 다른 쪽 이름은 대표 부품의 별칭이 돼요. 되돌릴 수 없어요.
          </p>
          <div className="flex gap-2">
            <Button
              disabled={busy}
              onClick={() =>
                merge.mutate(
                  { id: candidate.id, primaryPartId: primaryId },
                  { onSettled: () => setConfirming(false) },
                )
              }
            >
              {merge.isPending ? '병합 중…' : '병합 확인'}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
              취소
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => setConfirming(true)}>
            <Combine size={16} aria-hidden />
            병합
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => dismiss.mutate(candidate.id)}>
            {dismiss.isPending ? '처리 중…' : '다른 부품'}
          </Button>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-body-sm text-text-danger">
          {apiErrorMessage(error, '처리하지 못했어요.')}
        </p>
      ) : null}
    </li>
  );
};

// 숨은 재고 (W-07, F-MATCH-03). 같은 규격인데 다른 이름으로 등록된 부품 쌍을 합치거나 다른 부품으로 표시한다.
const HiddenStockList = () => {
  const { data: candidates, isPending, isError, refetch } = useMergeCandidates();

  if (isPending) {
    return <p className="text-body-md text-text-secondary">중복 의심 부품을 불러오는 중이에요…</p>;
  }
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-body-md text-text-danger">중복 의심 부품을 불러오지 못했어요.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }
  if (candidates.length === 0) {
    return (
      <p className="rounded-md bg-bg-surface p-8 text-center text-body-md text-text-secondary shadow-card">
        중복 의심 부품이 없어요.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {candidates.map((candidate) => (
        <CandidateCard key={candidate.id} candidate={candidate} />
      ))}
    </ul>
  );
};

export default HiddenStockList;
