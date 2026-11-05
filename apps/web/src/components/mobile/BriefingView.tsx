'use client';

import {
  ChevronRight,
  ClipboardCheck,
  Inbox,
  PackageSearch,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { MissedOrder } from '@bjk/api/types/briefing';

import ErrorState from '@/components/ui/ErrorState';
import SpotlightIllustration from '@/components/illustration/SpotlightIllustration';
import VerdictTags from '@/components/review/VerdictTags';
import ComputedAt from '@/components/ui/ComputedAt';
import IconCircle from '@/components/ui/IconCircle';
import { useBriefing } from '@/hooks/briefing/useBriefing';
import { formatDate, formatWon } from '@/utils/format';

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h2 className="text-h3 text-text-heading">{title}</h2>
    <ul className="flex flex-col gap-2">{children}</ul>
  </section>
);

const MissedItem = ({ item }: { item: MissedOrder }) => (
  <li>
    <Link
      href={`/m/reviews/${item.review_id}`}
      className="flex items-center gap-3 rounded-xl bg-bg-surface p-5 shadow-card active:bg-bg-subtle"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="truncate text-label-lg text-text-heading">
          {item.part ?? '부품 확인 중'}
        </span>
        {item.verdict ? <VerdictTags verdict={item.verdict} flags={item.flags} /> : null}
        <span className="text-body-sm text-text-body tabular-nums">
          {item.t_deadline ? `발주 마감 ${formatDate(item.t_deadline)} · ` : ''}
          예상 손실 {formatWon(item.expected_loss)}
        </span>
      </div>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
        <ChevronRight size={18} aria-hidden />
      </span>
    </Link>
  </li>
);

// 아침 브리핑 (M-04, F-NOTI-02). 놓친 발주(예상 손실 큰 순) → 확인할 일 건수.
// 머리는 큰 굵은 제목 한 줄 + 브랜드 일러스트 (2026-11-05 개편, design-system.md "화면 인상").
const BriefingView = () => {
  const { data: briefing, isPending, isError, refetch } = useBriefing();

  if (isPending) {
    return <p className="text-body-md text-text-secondary">브리핑을 불러오는 중이에요…</p>;
  }
  if (isError) {
    return <ErrorState title="브리핑을 불러오지 못했어요" onRetry={() => refetch()} />;
  }

  const { missed } = briefing;
  // 놓친 발주만 항목이 오고 나머지는 건수만 온다 (DSH-01)
  const counts = [
    ['검토 대기', briefing.pending_reviews, Inbox, 'brand'],
    ['실사 필요', briefing.count_needed, ClipboardCheck, 'inverse'],
    ['주문·입고 확인', briefing.order_check_needed, PackageSearch, 'gradient'],
    ['정비 완료 확인', briefing.maintenance_check_needed, Wrench, 'brand'],
  ] as const;
  const total = missed.count + counts.reduce((sum, [, count]) => sum + count, 0);

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
          놓친 발주도, 결정할 검토도, 확인할 일도 없어요.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {/* 강조 카드는 하나 — 가장 급한 놓친 발주. 라벨이 놓이는 왼쪽 위는 brand-600(흰 글씨 대비 5.2), 가운데 brand-500 에는 큰 숫자만, 오른쪽 아래 brand-300 에는 글씨를 두지 않는다(원칙 5).
                인쇄하면 그라데이션이 빠지므로 글씨를 본문색으로 바꾼다. */}
            <div className="flex items-center gap-4 rounded-xl bg-bg-brand bg-linear-to-br from-brand-600 via-brand-500 to-brand-300 p-5 text-text-on-brand shadow-raised print:text-text-heading">
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-label-md">놓친 발주</span>
                <span className="text-display">{missed.count}건</span>
                <span className="text-label-sm">
                  {missed.loss_total
                    ? `예상 손실 ${formatWon(missed.loss_total)}`
                    : '예상 손실 계산 전'}
                </span>
              </div>
              <IconCircle icon={TriangleAlert} tone="onHero" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {counts.map(([label, count, icon, tone]) => (
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
              {missed.items.map((item) => (
                <MissedItem key={item.review_id} item={item} />
              ))}
            </Group>
          ) : null}
        </>
      )}
    </div>
  );
};

export default BriefingView;
