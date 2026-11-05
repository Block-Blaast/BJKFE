'use client';

import { Combine } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import type { MergeCandidate, MergeStatus } from '@bjk/api/types/audit';
import Button from '@bjk/ui/components/Button';

import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import FolderCard from '@/components/ui/FolderCard';
import { useDecideMerge, useMergeCandidates } from '@/hooks/audit/useMergeCandidates';
import { apiErrorMessage } from '@/utils/apiError';
import { formatDate, formatQty } from '@/utils/format';

// 후보 응답에 단위가 없어 수량만 쓴다
const qty = (n: number) => formatQty(n, '');

const CandidateCard = ({ candidate }: { candidate: MergeCandidate }) => {
  const decide = useDecideMerge();
  const [primaryId, setPrimaryId] = useState<string>(candidate.parts[0].id);
  const [confirming, setConfirming] = useState(false);
  const busy = decide.isPending;
  const pendingAction = decide.isPending ? decide.variables.input.action : null;
  const decidable = candidate.status === 'open' || candidate.status === 'count_requested';
  const total = candidate.parts[0].stock + candidate.parts[1].stock;

  return (
    <li className="flex flex-col gap-4 rounded-xl bg-bg-surface p-6 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-label-lg text-text-heading">같은 규격, 비슷한 이름</span>
        <span className="text-body-sm text-text-secondary tabular-nums">
          유사도 {Math.round(candidate.score * 100)}%
        </span>
      </div>

      <fieldset className="grid grid-cols-2 gap-3" disabled={!decidable || busy}>
        <legend className="sr-only">대표 부품 선택</legend>
        {candidate.parts.map((part) => {
          const isPrimary =
            candidate.status === 'merged'
              ? candidate.representative_part_id === part.id
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
                재고 {qty(part.stock)} ·{' '}
                {part.last_counted_at
                  ? `마지막 실사 ${formatDate(part.last_counted_at)}`
                  : '실사 기록 없음'}
              </span>
            </label>
          );
        })}
      </fieldset>

      {candidate.status === 'merged' ? (
        <p className="text-body-sm text-text-success tabular-nums">
          병합했어요. 재고는 합쳐서 {qty(total)}로 계산돼요.
        </p>
      ) : candidate.status === 'different' ? (
        <p className="text-body-sm text-text-secondary">다른 부품으로 표시했어요.</p>
      ) : confirming ? (
        <div className="flex flex-col gap-3 rounded-md bg-bg-subtle p-4">
          <p className="text-body-md text-text-body">
            선택한 부품을 대표로 병합할까요? 원장 기록은 그대로 두고, 재고는 합쳐서{' '}
            <strong className="text-label-lg tabular-nums">{qty(total)}</strong>로 계산해요. 다른 쪽
            이름은 대표 부품의 별칭이 돼요. 되돌릴 수 없어요.
          </p>
          <div className="flex gap-2">
            <Button
              disabled={busy}
              onClick={() =>
                decide.mutate(
                  {
                    id: candidate.id,
                    input: { action: 'merge', representative_part_id: primaryId },
                  },
                  { onSettled: () => setConfirming(false) },
                )
              }
            >
              {pendingAction === 'merge' ? '병합 중…' : '병합 확인'}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
              취소
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={busy} onClick={() => setConfirming(true)}>
            <Combine size={16} aria-hidden />
            병합
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => decide.mutate({ id: candidate.id, input: { action: 'different' } })}
          >
            {pendingAction === 'different' ? '처리 중…' : '다른 부품'}
          </Button>
          {candidate.status === 'open' ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                decide.mutate({ id: candidate.id, input: { action: 'request_count' } })
              }
            >
              {pendingAction === 'request_count' ? '처리 중…' : '실사 후 결정'}
            </Button>
          ) : (
            <span className="text-body-sm text-text-secondary">실사 후 결정하기로 했어요.</span>
          )}
        </div>
      )}

      {decide.error ? (
        <p role="alert" className="text-body-sm text-text-danger">
          {apiErrorMessage(decide.error, '처리하지 못했어요.')}
        </p>
      ) : null}
    </li>
  );
};

type Folder = 'open' | 'merged' | 'different';

// 실사 후 결정(count_requested)도 아직 결정 전이라 '고를 차례'에 둔다
const FOLDER_OF: Partial<Record<MergeStatus, Folder>> = {
  open: 'open',
  count_requested: 'open',
  merged: 'merged',
  different: 'different',
};

const FOLDERS: { status: Folder; title: string; foot: string }[] = [
  { status: 'open', title: '고를 차례', foot: '합칠지, 다른 부품인지' },
  { status: 'merged', title: '합침', foot: '재고가 한 부품으로 모였어요' },
  { status: 'different', title: '다른 부품', foot: '다시 묻지 않아요' },
];

// 숨은 재고 (W-07, F-MATCH-03). 같은 규격인데 다른 이름으로 등록된 부품 쌍을 합치거나 다른 부품으로 표시한다.
// 폴더(상태)는 URL(?status=)에 둔다. usePathname·useSearchParams 를 쓰므로 페이지에서 <Suspense> 로 감싼다.
const HiddenStockList = () => {
  const router = useRouter();
  const pathname = usePathname();
  const raw = useSearchParams().get('status');
  const status = FOLDERS.find((f) => f.status === raw)?.status ?? 'open';
  const { data: all, isPending, isError, refetch } = useMergeCandidates();
  const candidates = all?.filter((c) => FOLDER_OF[c.status] === status);
  const countOf = (s: Folder) =>
    all ? `${all.filter((c) => FOLDER_OF[c.status] === s).length}쌍` : '…';

  const folders = (
    <nav aria-label="처리 상태" className="grid grid-cols-5 gap-5">
      {FOLDERS.map((f) => (
        <FolderCard
          key={f.status}
          title={f.title}
          count={countOf(f.status)}
          foot={f.foot}
          selected={status === f.status}
          onClick={() =>
            router.replace(f.status === 'open' ? pathname : `${pathname}?status=${f.status}`, {
              scroll: false,
            })
          }
        />
      ))}
    </nav>
  );

  if (isPending) {
    return (
      <p className="text-body-md text-text-secondary">
        같은 부품일 수 있는 항목을 불러오는 중이에요…
      </p>
    );
  }
  if (isError || !candidates) {
    return (
      <ErrorState title="같은 부품일 수 있는 항목을 불러오지 못했어요" onRetry={() => refetch()} />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {folders}
      {candidates.length === 0 ? (
        <EmptyState
          title={
            status === 'open' ? '같은 부품일 수 있는 항목이 없어요' : '아직 처리한 쌍이 없어요'
          }
        >
          {status === 'open' ? '규격이 같은데 이름이 다른 부품을 매주 월요일에 찾아요.' : null}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default HiddenStockList;
