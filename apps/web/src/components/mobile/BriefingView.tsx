'use client';

import { ChevronRight, ClipboardCheck, Inbox, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { Review } from '@bjk/api/types/review';

import ErrorState from '@/components/ui/ErrorState';
import SpotlightIllustration from '@/components/illustration/SpotlightIllustration';
import { entryLabelOf } from '@/components/review/labels';
import VerdictTags from '@/components/review/VerdictTags';
import ComputedAt from '@/components/ui/ComputedAt';
import IconCircle from '@/components/ui/IconCircle';
import { useBriefing } from '@/hooks/briefing/useBriefing';
import { formatDate, formatQty, formatWon } from '@/utils/format';

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h2 className="text-h3 text-text-heading">{title}</h2>
    <ul className="flex flex-col gap-2">{children}</ul>
  </section>
);

const ReviewItem = ({ review }: { review: Review }) => (
  <li>
    <Link
      href={`/m/reviews/${review.id}`}
      className="flex items-center gap-3 rounded-xl bg-bg-surface p-5 shadow-card active:bg-bg-subtle"
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
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
        <ChevronRight size={18} aria-hidden />
      </span>
    </Link>
  </li>
);

// 아침 브리핑 (M-04, F-NOTI-02). 놓친 발주 → 검토 대기 → 실사 필요 순, 각각 예상 손실·긴급 순.
// 머리는 큰 굵은 제목 한 줄 + 브랜드 일러스트 (2026-11-05 개편, design-system.md "화면 인상").
const BriefingView = () => {
  const { data: briefing, isPending, isError, refetch } = useBriefing();

  if (isPending) {
    return <p className="text-body-md text-text-secondary">브리핑을 불러오는 중이에요…</p>;
  }
  if (isError) {
    return <ErrorState title="브리핑을 불러오지 못했어요" onRetry={() => refetch()} />;
  }

  const { missed, pending_reviews: pending, audits } = briefing;
  const total = missed.items.length + pending.items.length + audits.items.length;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-4 pt-2 text-center">
        <SpotlightIllustration className="h-40 w-auto" />
        <div className="flex flex-col gap-2">
          <h1 className="text-display text-text-heading">
            {total === 0 ? '오늘은 조용해요' : `확인할 일 ${total}건`}
          </h1>
          <p className="flex items-center justify-center gap-1 text-body-md text-text-secondary">
            아침 브리핑 · <ComputedAt at={briefing.computed_at} />
          </p>
        </div>
      </header>

      {total === 0 ? (
        <p className="rounded-xl bg-bg-surface p-6 text-center text-body-md text-text-secondary shadow-card">
          놓친 발주도, 결정할 검토도, 실사할 부품도 없어요.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {/* 강조 카드는 하나 — 가장 급한 놓친 발주. 라벨이 놓이는 왼쪽 위는 brand-600(흰 글씨 대비 5.2), 가운데 brand-500 에는 큰 숫자만, 오른쪽 아래 brand-300 에는 글씨를 두지 않는다(원칙 5).
                인쇄하면 그라데이션이 빠지므로 글씨를 본문색으로 바꾼다. */}
            <div className="flex items-center gap-4 rounded-xl bg-bg-brand bg-linear-to-br from-brand-600 via-brand-500 to-brand-300 p-5 text-text-on-brand shadow-raised print:text-text-heading">
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-label-md">놓친 발주</span>
                <span className="text-display">{missed.items.length}건</span>
                <span className="text-label-sm">
                  {missed.loss_total
                    ? `예상 손실 ${formatWon(missed.loss_total)}`
                    : '손실액 미등록 부품 포함'}
                </span>
              </div>
              <IconCircle icon={TriangleAlert} tone="onHero" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['검토 대기', pending.items.length, Inbox, 'brand'],
                  ['실사 필요', audits.items.length, ClipboardCheck, 'inverse'],
                ] as const
              ).map(([label, count, icon, tone]) => (
                <div
                  key={label}
                  className="flex flex-col gap-3 rounded-xl bg-bg-surface p-5 shadow-card"
                >
                  <IconCircle icon={icon} tone={tone} />
                  <div className="flex flex-col">
                    <span className="text-label-md text-text-secondary">{label}</span>
                    <span className="text-h1 text-text-heading">{count}건</span>
                  </div>
                </div>
              ))}
            </div>
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
                  className="flex flex-col gap-1 rounded-xl bg-bg-surface p-5 shadow-card"
                >
                  <span className="text-label-lg text-text-heading">{item.part.name}</span>
                  <span className="text-body-sm text-text-body">{item.reason}</span>
                  <span className="text-body-sm text-text-secondary tabular-nums">
                    기록상 {formatQty(item.ledger_qty, item.part.unit)} · 우선순위 {item.grade}
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
