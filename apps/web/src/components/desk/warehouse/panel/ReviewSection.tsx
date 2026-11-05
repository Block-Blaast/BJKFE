'use client';

import { ArrowRight, Truck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ApiError } from '@bjk/api/client';
import { APPROVAL_ACTIONS } from '@bjk/api/domain/review';
import type { Review } from '@bjk/api/types/review';
import type { TwinArrival } from '@bjk/api/types/twin';
import Button from '@bjk/ui/components/Button';

import VerdictTags from '@/components/review/VerdictTags';
import { DotTag, InfoSection } from '@/components/ui/InfoPanel';
import { useDecideReview } from '@/hooks/review/useDecideReview';
import { useReview } from '@/hooks/review/useReview';
import { useReviews } from '@/hooks/review/useReviews';
import { useTwinProjection } from '@/hooks/twin/useTwinLayout';
import { useWarehouseBridge } from '@/hooks/twin/useWarehouseBridge';
import { formatDate, formatQty } from '@/utils/format';
import { locsByPart } from '@/utils/twin';

import type { BinSectionProps, OverviewSectionProps } from './types';

const LINK =
  'flex h-10 items-center gap-1 rounded-full bg-bg-subtle px-4 text-label-sm text-text-body transition-colors hover:bg-bg-brand-subtle hover:text-text-brand';

const ROW =
  'flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-bg-subtle';

// 상세 화면 경로 함수가 routes.ts 에 없어 검토함(ReviewInbox)·대시보드와 같은 모양으로 만든다
const reviewHref = (id: string) => `/reviews/${id}`;

// 수정안 상자(kind 'proposal')는 "발주하면" 예측에만 실린다 — 토글과 상관없이 결정 대기는 그쪽에서 읽는다.
// WarehouseView 가 이미 같은 쿼리를 받아 두므로 캐시에서 나온다
const usePendingArrivals = () => {
  const { data } = useTwinProjection(true);
  return data?.arrivals ?? [];
};

// ApprovalActions 와 같은 기준: 적정이면 "승인", 수정 권고면 "수정안 승인".
// 수량 0(발주 불필요 수용)은 도착 상자가 없어 여기 오지 않는다(목업 twin.ts 가 qty 0 을 뺀다)
const approveLabelOf = (review: Review) =>
  review.verdict === '적정' ? '승인' : APPROVAL_ACTIONS.approveProposal;

const errorMessageOf = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.status === 409) return '다른 사람이 먼저 처리했어요. 화면이 최신 결과로 바뀌어요.';
    const body = error.body as { message?: string } | undefined;
    if (body?.message) return body.message;
  }
  return '처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
};

type ProposalCardProps = {
  arrival: TwinArrival & { review_id: string };
  unit: string;
  onApproved: () => void;
};

// 결정 대기 검토 하나 — 승인만 패널에서 하고, 체크 9가지·원안 승인·반려는 상세(/reviews/[id])에서 한다
const ProposalCard = ({ arrival, unit, onApproved }: ProposalCardProps) => {
  const { data: review, isPending, isError } = useReview(arrival.review_id);
  const decide = useDecideReview();
  const [confirming, setConfirming] = useState(false);

  const label = review ? approveLabelOf(review) : APPROVAL_ACTIONS.approveProposal;
  // 승인 직후에는 상세 캐시가 먼저 '발주됨'이 되고, projection 을 다시 받으면 이 카드가 빠진다
  const decidable = review?.status === '검토완료';

  const approve = () => {
    if (!review) return;
    decide.mutate(
      { review, input: { action: 'approveProposal' } },
      {
        onSuccess: onApproved,
        onSettled: () => setConfirming(false),
      },
    );
  };

  return (
    <li className="flex flex-col gap-3 rounded-md bg-bg-page p-3">
      {review ? (
        <VerdictTags verdict={review.verdict} flags={review.flags} />
      ) : isError ? (
        <p className="text-body-sm text-text-danger">검토 내용을 불러오지 못했어요.</p>
      ) : isPending ? (
        <p className="text-body-sm text-text-secondary">검토 내용을 불러오는 중…</p>
      ) : null}
      <p className="text-label-md text-text-heading tabular-nums">
        {review?.verdict === '적정' ? '요청 수량' : '수정안'} {formatQty(arrival.qty, unit)} · 도착
        예정 {formatDate(arrival.eta)}
      </p>
      {review && review.original.qty !== arrival.qty ? (
        <p className="text-body-sm text-text-secondary tabular-nums">
          원래 요청 {formatQty(review.original.qty, unit)}
        </p>
      ) : null}
      {decide.isError ? (
        <p role="alert" className="text-body-sm text-text-danger">
          {errorMessageOf(decide.error)}
        </p>
      ) : null}
      {confirming && review ? (
        <div className="flex flex-col gap-2">
          <p className="text-body-sm text-text-heading">
            {formatQty(arrival.qty, unit)}을 {label}할까요? 되돌릴 수 없어요.
          </p>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={decide.isPending} onClick={approve}>
              {decide.isPending ? '처리 중…' : `${label} 확인`}
            </Button>
            <Button
              variant="secondary"
              disabled={decide.isPending}
              onClick={() => setConfirming(false)}
            >
              취소
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {decidable ? <Button onClick={() => setConfirming(true)}>{label}</Button> : null}
          <Link href={reviewHref(arrival.review_id)} className={LINK}>
            검토 열기
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      )}
    </li>
  );
};

// 칸을 골랐을 때 — 그 부품의 결정 대기 검토와 이미 발주된 도착 예정
const ReviewSection = ({ part }: BinSectionProps) => {
  const arrivals = usePendingArrivals().filter((a) => a.part_id === part.id);
  // 섹션은 칸을 바꿔도 그대로 붙어 있어 부품 id 로 묶는다 — 다른 칸에 안내가 남지 않게
  const [approvedPart, setApprovedPart] = useState<string | null>(null);
  const approved = approvedPart === part.id;

  const proposals = arrivals.filter(
    (a): a is TwinArrival & { review_id: string } => a.kind === 'proposal' && a.review_id !== null,
  );
  // 승인되면 같은 상자가 kind 'ordered' 로 바뀌고 review_id 는 null 이다(입고 예정 O 에서 만들어서) — 링크하지 않는다
  const ordered = arrivals.filter((a) => a.kind === 'ordered');

  if (!proposals.length && !ordered.length && !approved) return null;

  return (
    <InfoSection title={proposals.length ? `결정 대기 ${proposals.length}건` : '발주'}>
      {approved ? (
        <p role="status" className="text-body-sm text-text-success">
          승인했어요. 발주 기록이 만들어지고 도착 예정에 올랐어요.
        </p>
      ) : null}
      {proposals.length ? (
        <ul className="flex flex-col gap-2">
          {proposals.map((a) => (
            <ProposalCard
              key={a.review_id}
              arrival={a}
              unit={part.unit}
              onApproved={() => setApprovedPart(part.id)}
            />
          ))}
        </ul>
      ) : null}
      {ordered.length ? (
        <ul className="flex flex-col gap-2">
          {ordered.map((a) => (
            <li key={`${a.eta}-${a.qty}`} className="flex items-center gap-2">
              <Truck size={16} aria-hidden className="shrink-0 text-icon-success" />
              <span className="text-body-sm text-text-body tabular-nums">
                발주됨 · 도착 예정 {formatDate(a.eta)} ({formatQty(a.qty, part.unit)})
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </InfoSection>
  );
};

// 아무것도 안 골랐을 때 — 결정 대기 검토 목록. 누르면 그 부품 칸으로 날아간다
export const ReviewOverviewSection = ({ layout }: OverviewSectionProps) => {
  const proposals = usePendingArrivals().filter(
    (a): a is TwinArrival & { review_id: string } => a.kind === 'proposal' && a.review_id !== null,
  );
  const { data: pending } = useReviews({ status: 'pending' });
  const bridge = useWarehouseBridge();

  if (!proposals.length) return null;

  const reviewOf = new Map((pending ?? []).map((r) => [r.id, r]));
  const locsOf = locsByPart(layout.placements);

  return (
    <InfoSection title={`결정 대기 ${proposals.length}건`}>
      <ul className="flex flex-col gap-1">
        {proposals.map((a) => {
          const review = reviewOf.get(a.review_id);
          const loc = locsOf.get(a.part_id)?.[0];
          return (
            <li key={a.review_id}>
              <button
                type="button"
                disabled={!loc}
                onClick={() => loc && bridge.goTo(loc)}
                className={ROW}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-label-md text-text-heading">
                    {review?.part.name ?? a.part_id}
                  </span>
                  <span className="text-label-sm text-text-secondary tabular-nums">
                    {review ? formatQty(a.qty, review.part.unit) : a.qty} · 도착 예정{' '}
                    {formatDate(a.eta)}
                  </span>
                </span>
                {review ? (
                  <DotTag as="span" tone="neutral">
                    {review.verdict}
                  </DotTag>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </InfoSection>
  );
};

export default ReviewSection;
