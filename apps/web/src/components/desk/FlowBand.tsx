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

import type { ReviewStatus } from '@bjk/api/domain/review';

import { useTodayActivity } from '@/hooks/activity/useTodayActivity';
import { useReviews } from '@/hooks/review/useReviews';

type Step = {
  key: string;
  label: string;
  who: string;
  icon: LucideIcon;
  href: string;
  count: number | null;
  note?: string;
};

const countOf = (statuses: ReviewStatus[], list: { status: ReviewStatus }[] | undefined) =>
  list ? list.filter((r) => statuses.includes(r.status)).length : null;

// 서비스 흐름 띠 (v2) — 현장 기록 → 자동 검토 → 사장님 결정 → 발주·납기 → 입고 검수.
// 단계 이름은 검토 상태(F-APPROVAL-02)와 1:1로 맞춘다. 가운데 "자동 검토"가 제품이 하는 일이라 비워 두지 않는다.
// 지금 사장님 손에 걸린 단계(결정 대기)만 파랑으로 강조해, 대시보드에서 "다음에 할 일"이 먼저 보이게 한다.
const FlowBand = () => {
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

  const steps: Step[] = [
    {
      key: 'record',
      label: '현장 기록',
      who: '작업자 · 채팅',
      icon: MessageSquareText,
      href: '/warehouse',
      count: activity.data ? activity.data.filter((a) => a.kind === 'movement').length : null,
      note: '오늘',
    },
    {
      key: 'review',
      label: '자동 검토',
      who: '시스템 · 체크 9가지',
      icon: ClipboardCheck,
      href: '/reviews',
      count: reviewedToday ? reviewedToday.length : null,
      note: '오늘 올라옴',
    },
    {
      key: 'decide',
      label: '사장님 결정',
      who: '검토함 · 결정 대기',
      icon: Inbox,
      href: '/reviews',
      count: pending ? pending.length : null,
      note: urgent ? `긴급 ${urgent}건` : undefined,
    },
    {
      key: 'ordered',
      label: '발주·납기',
      who: '공급사 · 도착 대기',
      icon: Truck,
      href: '/reports',
      count: countOf(['발주됨', '부분입고'], reviews.data),
    },
    {
      key: 'received',
      label: '입고 검수',
      who: '작업자 · 수량 확인',
      icon: PackageCheck,
      href: '/reports',
      count: countOf(['입고완료'], reviews.data),
    },
  ];

  return (
    <nav aria-label="발주 흐름">
      <ol className="flex items-stretch gap-2 rounded-xl bg-bg-surface p-2 shadow-card">
        {steps.map((step, i) => {
          const focus = step.key === 'decide' && !!step.count;
          const Icon = step.icon;
          return (
            <li key={step.key} className="flex flex-1 items-center gap-2">
              <Link
                href={step.href}
                className={`flex flex-1 items-center gap-4 rounded-md px-4 py-3 transition-colors ${
                  focus
                    ? 'bg-bg-brand text-text-on-brand hover:bg-bg-brand-hover'
                    : 'text-text-heading hover:bg-bg-subtle'
                }`}
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    focus ? 'bg-bg-surface text-text-brand' : 'bg-bg-subtle text-text-secondary'
                  }`}
                >
                  <Icon size={18} aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-label-md">{step.label}</span>
                  <span className={`text-label-sm ${focus ? '' : 'text-text-secondary'}`}>
                    {step.note ? `${step.who} · ${step.note}` : step.who}
                  </span>
                </span>
                <span className="text-h2">{step.count === null ? '—' : `${step.count}건`}</span>
              </Link>
              {i < steps.length - 1 ? (
                <ChevronRight size={18} aria-hidden className="shrink-0 text-text-secondary" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default FlowBand;
