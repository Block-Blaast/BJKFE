'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { APPROVAL_ACTIONS } from '@bjk/api/domain/review';
import Button from '@bjk/ui/components/Button';

import ReviewStatusTag from '@/components/review/ReviewStatusTag';
import EmptyState from '@/components/ui/EmptyState';
import { useMyRequests } from '@/hooks/review/useMyRequests';
import { formatComputedAt, formatQty } from '@/utils/format';

// 내 요청 (M-03). 상태와, 반려·보류·수정 승인됐다면 그 결과와 사유를 보여준다.
const MyRequestList = () => {
  const { data: requests, isPending, isError, refetch } = useMyRequests();

  if (isPending) {
    return <p className="text-body-md text-text-secondary">요청 목록을 불러오는 중이에요…</p>;
  }
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-body-md text-text-danger">요청 목록을 불러오지 못했어요.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h2 text-text-heading">내 요청</h1>
      {requests.length === 0 ? (
        <EmptyState title="아직 올린 요청이 없어요">
          채팅에서 &quot;V벨트 30개 시켜주세요&quot;처럼 말해 보세요.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {requests.map((request) => (
            <li key={request.id}>
              <Link
                href={`/m/reviews/${request.id}`}
                className="flex items-center gap-3 rounded-xl bg-bg-surface p-5 shadow-card active:bg-bg-subtle"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-label-lg text-text-heading">
                      {request.part.name}
                    </span>
                    <ReviewStatusTag status={request.status} />
                  </div>
                  <span className="text-body-sm text-text-body tabular-nums">
                    {formatQty(request.original.qty, request.part.unit)} 요청 ·{' '}
                    {formatComputedAt(request.requested_at)}
                  </span>
                  {request.decision ? (
                    <span className="text-body-sm text-text-body">
                      {APPROVAL_ACTIONS[request.decision.action]}
                      {request.decision.reason ? ` — ${request.decision.reason}` : ''}
                    </span>
                  ) : null}
                </div>
                <ChevronRight size={20} aria-hidden className="shrink-0 text-text-secondary" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyRequestList;
