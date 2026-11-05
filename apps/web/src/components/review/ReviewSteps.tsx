'use client';

import {
  CircleAlert,
  CircleCheck,
  Info,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { CHECKS, type CheckCode, type CheckLevel } from '@bjk/api/domain/review';
import type { Review } from '@bjk/api/types/review';

import Tag, { type TagTone } from '@/components/ui/Tag';
import { useReview } from '@/hooks/review/useReview';

import VerdictTags from './VerdictTags';

// 체크 9가지(C-01~09)를 사람이 읽는 순서의 5단계로 묶는다. 묶음은 화면 표현일 뿐, 결과는 review.checks 그대로다.
const STEPS: { label: string; codes: CheckCode[] }[] = [
  { label: '재고·소모량', codes: ['C-07', 'C-01', 'C-02'] },
  { label: '진행 중인 발주·숨은 재고', codes: ['C-03', 'C-04'] },
  { label: '단가·공급사', codes: ['C-05', 'C-06'] },
  { label: '납기·발주 마감', codes: ['C-08'] },
  { label: '외부 요인(해상운임·환율)', codes: ['C-09'] },
];

const LEVEL_TAG: Record<CheckLevel, { tone: TagTone; icon: LucideIcon }> = {
  긴급: { tone: 'danger', icon: TriangleAlert },
  경고: { tone: 'warning', icon: CircleAlert },
  정보: { tone: 'neutral', icon: Info },
};

// 한 단계가 "확인 중"으로 머무는 시간. 5단계 + 판정 ≈ 2.7초
const STEP_MS = 450;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Steps = ({ review }: { review: Review }) => {
  const ready = review.status !== '검토중';
  // done = 결과까지 보인 단계 수. STEPS.length 를 넘으면 판정까지 보인 상태
  const [done, setDone] = useState(() => (prefersReducedMotion() ? STEPS.length + 1 : 0));
  const rootRef = useRef<HTMLDivElement>(null);

  // 채팅은 새 메시지가 붙을 때만 아래로 내린다. 단계가 늘며 카드가 길어지면 아래가 잘리므로 카드 끝을 따라간다
  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: 'nearest' });
  }, [done]);

  useEffect(() => {
    // 서버가 아직 검토 중이면 체크 결과가 비어 있어 "이상 없음"으로 잘못 보인다 → 첫 단계 "확인 중"에서 기다린다
    // (SSE review.created 가 캐시를 갱신하면 다시 흐른다)
    if (done > STEPS.length || !ready) return;
    const timer = setTimeout(() => setDone((n) => n + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [done, ready]);

  const hits = new Map(review.checks.map((c) => [c.code, c]));
  const finished = done > STEPS.length;

  return (
    <div
      ref={rootRef}
      className="flex flex-col gap-4 rounded-xl border border-border-brand bg-bg-surface p-5"
    >
      <span className="flex items-center gap-1 text-label-md text-text-brand">
        <Sparkles size={16} aria-hidden className="text-icon-brand" />
        {finished ? '검토를 마쳤어요' : '근거를 확인하고 있어요'}
      </span>
      <ol className="flex flex-col gap-3">
        {STEPS.map((step, i) => {
          if (i > done) return null;
          const found = step.codes.flatMap((code) => {
            const hit = hits.get(code);
            return hit ? [hit] : [];
          });
          const checking = i === done;
          return (
            <li key={step.label} className="flex animate-step-in items-center gap-2">
              {checking ? (
                <LoaderCircle
                  size={18}
                  aria-hidden
                  className="shrink-0 animate-spin text-icon-brand"
                />
              ) : found.length ? (
                <CircleAlert size={18} aria-hidden className="shrink-0 text-icon-warning" />
              ) : (
                <CircleCheck size={18} aria-hidden className="shrink-0 text-icon-success" />
              )}
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="text-body-md text-text-heading">{step.label}</span>
                {checking ? (
                  <span className="text-body-sm text-text-secondary">확인 중…</span>
                ) : found.length ? (
                  found.map((c) => (
                    <span key={c.code} className="animate-step-in">
                      <Tag {...LEVEL_TAG[c.level]}>{CHECKS[c.code].name}</Tag>
                    </span>
                  ))
                ) : (
                  <span className="text-body-sm text-text-secondary">이상 없음</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {finished ? (
        <div className="flex flex-col gap-2 border-t border-border-default pt-4">
          <span className="text-label-sm text-text-secondary">판정</span>
          <div className="w-fit origin-left animate-verdict-thud">
            <VerdictTags verdict={review.verdict} flags={review.flags} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

type ReviewStepsProps = {
  reviewId: string;
};

// 채팅에서 발주 요청이 검토로 올라간 직후, 검토가 어떤 근거를 봤는지 단계별로 켜 보인다 (F-REVIEW-04 체크 9종).
// 서버 결과는 이미 나와 있다 — 시간차는 화면 연출이고, 걸린 체크·판정은 review 그대로다.
const ReviewSteps = ({ reviewId }: ReviewStepsProps) => {
  const { data: review } = useReview(reviewId);
  if (!review) return null;
  return <Steps review={review} />;
};

export default ReviewSteps;
