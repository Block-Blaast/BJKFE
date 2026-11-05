'use client';

import {
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Inbox,
  MessageSquareText,
  PackageCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import type { ReviewStatus } from '@bjk/api/domain/review';

import { DESK_FLOW, isUnder, type DeskFlowKey } from '@/constants/routes';
import { useTodayActivity } from '@/hooks/activity/useTodayActivity';
import { useReviews } from '@/hooks/review/useReviews';
import { kstDay } from '@/utils/format';
import { parseReviewFilters } from '@/utils/reviewFilters';

import PendingReviewBadge from './PendingReviewBadge';

const ICONS: Record<DeskFlowKey, LucideIcon> = {
  record: MessageSquareText,
  review: ClipboardCheck,
  decide: Inbox,
  ordered: Truck,
  received: PackageCheck,
};

const countOf = (statuses: ReviewStatus[], list: { status: ReviewStatus }[] | undefined) =>
  list ? list.filter((r) => statuses.includes(r.status)).length : null;

type FlowStepsProps = {
  // null 이면 현재 경로를 아직 모르는 상태(프리렌더 fallback)라 활성 표시 없이 그린다.
  pathname: string | null;
  reviewStatus: 'all' | 'pending';
};

// 서비스 흐름 띠 = PC 주 메뉴 (v2) — 현장 기록 → 자동 검토 → 사장님 결정 → 발주·납기 → 입고 검수.
// 단계 이름은 검토 상태(F-APPROVAL-02)와 1:1로 맞춘다. 가운데 "자동 검토"가 제품이 하는 일이라 비워 두지 않는다.
// 지금 있는 단계는 검정 알약, 사장님 손에 걸린 "결정 대기"는 파란 숫자 배지로 보여 둘이 겹치지 않는다.
// TODO(auth): 권한별로 단계를 거른다. 입고 검수(장부 검증)는 관리자 이상.
const FlowSteps = ({ pathname, reviewStatus }: FlowStepsProps) => {
  const activity = useTodayActivity();
  const reviews = useReviews({ status: 'all' });
  const pending = reviews.data?.filter((r) => r.status === '검토완료');
  const urgent = pending?.filter((r) => r.flags.includes('긴급')).length ?? 0;
  // "오늘"은 시계가 아니라 지표 기준일(computed_at)로 본다 — 렌더 중에는 시계를 읽지 않는다(react-hooks/purity).
  // 새로 올린 검토의 requested_at 은 UTC(Z)로 올 수 있어 둘 다 KST 날짜로 바꿔 비교한다.
  const computedAt = reviews.data?.[0]?.computed_at;
  const baseDay = computedAt ? kstDay(computedAt) : undefined;
  const reviewedToday = baseDay
    ? reviews.data?.filter((r) => kstDay(r.requested_at) === baseDay)
    : undefined;

  const counts: Record<DeskFlowKey, number | null> = {
    record: activity.data ? activity.data.filter((a) => a.kind === 'movement').length : null,
    review: reviewedToday ? reviewedToday.length : null,
    decide: pending ? pending.length : null,
    ordered: countOf(['발주됨', '부분입고'], reviews.data),
    received: countOf(['입고완료'], reviews.data),
  };
  // 불러오기 실패를 '—'(아직 모름)와 같게 그리면 "오늘 아무 일도 없음"처럼 보인다. 실패는 따로 표시한다.
  const failed: Record<DeskFlowKey, boolean> = {
    record: activity.isError,
    review: reviews.isError,
    decide: reviews.isError,
    ordered: reviews.isError,
    received: reviews.isError,
  };
  const notes: Partial<Record<DeskFlowKey, string>> = {
    record: '오늘',
    review: '오늘 올라옴',
    decide: urgent ? `긴급 ${urgent}건` : undefined,
  };

  return (
    <ol className="flex items-center gap-1 rounded-full bg-bg-page p-1">
      {DESK_FLOW.map((step, i) => {
        const active =
          pathname !== null &&
          step.match.some((m) => isUnder(pathname, m)) &&
          (step.status === null || step.status === reviewStatus);
        const Icon = ICONS[step.key];
        const count = counts[step.key];
        const note = failed[step.key] ? '건수를 불러오지 못했어요' : notes[step.key];
        return (
          <li key={step.key} className="flex items-center gap-1">
            <Link
              href={step.href}
              aria-current={active ? 'page' : undefined}
              title={note ? `${step.who} · ${note}` : step.who}
              className={`flex h-10 items-center gap-2 rounded-full pr-4 pl-1 text-label-md whitespace-nowrap transition-colors ${
                active ? 'bg-bg-inverse text-text-on-inverse' : 'text-text-body hover:bg-bg-surface'
              }`}
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                  active ? 'bg-bg-surface text-text-heading' : 'bg-bg-subtle text-text-secondary'
                }`}
              >
                <Icon size={16} aria-hidden />
              </span>
              {step.label}
              {failed[step.key] ? (
                <span className="flex items-center text-icon-danger">
                  <CircleAlert size={16} aria-hidden />
                  <span className="sr-only">건수를 불러오지 못했어요</span>
                </span>
              ) : step.key === 'decide' ? (
                <PendingReviewBadge count={count} />
              ) : (
                <span
                  className={`text-label-md tabular-nums ${active ? '' : 'text-text-secondary'}`}
                >
                  {count === null ? '—' : count}
                  <span className="sr-only">건</span>
                </span>
              )}
            </Link>
            {i < DESK_FLOW.length - 1 ? (
              <ChevronRight size={14} aria-hidden className="shrink-0 text-text-secondary" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
};

// usePathname·useSearchParams 는 요청 시점 값이라 반드시 <Suspense> 안에서 렌더링한다 (DeskTopBar 참고).
const FlowBand = () => {
  const pathname = usePathname();
  // ②·③ 판정은 검토함과 같은 파서를 써서, 검토함의 기본 status 가 바뀌어도 활성 단계가 따라간다
  const { status } = parseReviewFilters(useSearchParams());
  return <FlowSteps pathname={pathname} reviewStatus={status} />;
};

export const FlowBandFallback = () => <FlowSteps pathname={null} reviewStatus="pending" />;

export default FlowBand;
