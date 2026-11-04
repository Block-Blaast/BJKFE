'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { Review } from '@bjk/api/types/review';
import Button from '@bjk/ui/components/Button';

import { entryLabelOf } from '@/components/review/labels';
import VerdictTags from '@/components/review/VerdictTags';
import ComputedAt from '@/components/ui/ComputedAt';
import { useBriefing } from '@/hooks/briefing/useBriefing';
import { formatDate, formatQty, formatWon } from '@/utils/format';

const Tile = ({ label, count, note }: { label: string; count: number; note?: string }) => (
  <div className="flex flex-1 flex-col gap-1 rounded-md bg-bg-surface p-4 shadow-card">
    <span className="text-label-sm text-text-secondary">{label}</span>
    <span className="text-h2 text-text-heading">{count}건</span>
    {note ? <span className="text-label-sm text-text-secondary tabular-nums">{note}</span> : null}
  </div>
);

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-2">
    <h2 className="text-label-lg text-text-heading">{title}</h2>
    <ul className="flex flex-col gap-2">{children}</ul>
  </section>
);

const ReviewItem = ({ review }: { review: Review }) => (
  <li>
    <Link
      href={`/m/reviews/${review.id}`}
      className="flex items-center gap-3 rounded-md bg-bg-surface p-4 shadow-card active:bg-bg-subtle"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-label-sm text-text-secondary">{entryLabelOf(review)}</span>
        <span className="truncate text-label-lg text-text-heading">{review.part.name}</span>
        <VerdictTags verdict={review.verdict} flags={review.flags} />
        {review.risk_if_not_ordered.stockout_date ? (
          <span className="text-body-sm text-text-body tabular-nums">
            소진 예상 {formatDate(review.risk_if_not_ordered.stockout_date)}
          </span>
        ) : null}
      </div>
      <ChevronRight size={20} aria-hidden className="shrink-0 text-text-secondary" />
    </Link>
  </li>
);

// 아침 브리핑 (M-04, F-NOTI-02). 놓친 발주 → 검토 대기 → 실사 필요 순, 각각 예상 손실·긴급 순.
const BriefingView = () => {
  const { data: briefing, isPending, isError, refetch } = useBriefing();

  if (isPending) {
    return <p className="text-body-md text-text-secondary">브리핑을 불러오는 중이에요…</p>;
  }
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-body-md text-text-danger">브리핑을 불러오지 못했어요.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  const { missed, pending_reviews: pending, audits } = briefing;
  const nothingToDo =
    missed.items.length === 0 && pending.items.length === 0 && audits.items.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-text-heading">아침 브리핑</h1>
        <ComputedAt at={briefing.computed_at} />
      </header>

      {nothingToDo ? (
        <p className="rounded-md bg-bg-surface p-6 text-center text-body-md text-text-secondary shadow-card">
          오늘 확인할 일이 없어요.
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            <Tile
              label="놓친 발주"
              count={missed.items.length}
              note={missed.loss_total ? `손실 ${formatWon(missed.loss_total)}` : undefined}
            />
            <Tile label="검토 대기" count={pending.items.length} />
            <Tile label="실사 필요" count={audits.items.length} />
          </div>

          {missed.items.length > 0 ? (
            <Group title="놓친 발주">
              {missed.items.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </Group>
          ) : null}

          {pending.items.length > 0 ? (
            <Group title="검토 대기">
              {pending.items.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </Group>
          ) : null}

          {audits.items.length > 0 ? (
            <Group title="실사 필요">
              {audits.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 rounded-md bg-bg-surface p-4 shadow-card"
                >
                  <span className="text-label-lg text-text-heading">{item.part.name}</span>
                  <span className="text-body-sm text-text-body">{item.reason}</span>
                  <span className="text-body-sm text-text-secondary tabular-nums">
                    장부상 {formatQty(item.ledger_qty, item.part.unit)} · 의심 등급 {item.grade}
                  </span>
                </li>
              ))}
            </Group>
          ) : null}
        </>
      )}
    </div>
  );
};

export default BriefingView;
