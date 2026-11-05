'use client';

import {
  ChevronRight,
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
  // 두 값 모두 +09:00 문자열이라 앞 10자리가 그대로 한국 날짜다.
  const baseDay = reviews.data?.[0]?.computed_at.slice(0, 10);
  const reviewedToday = baseDay
    ? reviews.data?.filter((r) => r.requested_at.slice(0, 10) === baseDay)
    : undefined;

  const counts: Record<DeskFlowKey, number | null> = {
    record: activity.data ? activity.data.filter((a) => a.kind === 'movement').length : null,
    review: reviewedToday ? reviewedToday.length : null,
    decide: pending ? pending.length : null,
    ordered: countOf(['발주됨', '부분입고'], reviews.data),
    received: countOf(['입고완료'], reviews.data),
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
        const note = notes[step.key];
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
              {step.key === 'decide' ? (
                <PendingReviewBadge />
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
  const searchParams = useSearchParams();
  return (
    <FlowSteps
      pathname={pathname}
      reviewStatus={searchParams.get('status') === 'all' ? 'all' : 'pending'}
    />
  );
};

export const FlowBandFallback = () => <FlowSteps pathname={null} reviewStatus="pending" />;

export default FlowBand;
