'use client';

import type { ReactNode } from 'react';

import type { Review } from '@bjk/api/types/review';
import Button from '@bjk/ui/components/Button';

import ComputedAt from '@/components/ui/ComputedAt';
import { useReview } from '@/hooks/review/useReview';
import { formatDate, formatWon } from '@/utils/format';

import ApprovalActions from './ApprovalActions';
import { entryLabelOf } from './labels';
import CheckList from './CheckList';
import OrderComparison from './OrderComparison';
import VerdictTags from './VerdictTags';

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3 rounded-md bg-bg-surface p-5 shadow-card">
    <h2 className="text-label-lg text-text-heading">{title}</h2>
    {children}
  </section>
);

const Opinion = ({ text }: { text: string }) => {
  const [headline, ...lines] = text.split('\n');
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label-lg text-text-heading">{headline}</p>
      {lines.map((line) => (
        <p key={line} className="text-body-md text-text-body">
          {line}
        </p>
      ))}
    </div>
  );
};

const Risk = ({ risk }: { risk: Review['risk_if_not_ordered'] }) => {
  if (!risk.stockout_date && risk.equipment.length === 0 && !risk.loss) {
    return <p className="text-body-md text-text-secondary">발주하지 않아도 결품 위험이 없어요.</p>;
  }
  return (
    <ul className="flex flex-col gap-1 text-body-md text-text-body tabular-nums">
      {risk.stockout_date ? <li>소진 예상일: {formatDate(risk.stockout_date)}</li> : null}
      {risk.equipment.length > 0 ? <li>멈추는 설비: {risk.equipment.join(', ')}</li> : null}
      <li>
        예상 손실:{' '}
        {risk.loss === null ? '손실액 미등록 (설비 정보에서 입력)' : formatWon(risk.loss)}
      </li>
    </ul>
  );
};

type ReviewDetailProps = {
  id: string;
  layout: 'mobile' | 'desk';
};

// 의견서·승인 (M-05) 과 검토 상세 (W-03) 가 같이 쓰는 본문. 데이터는 같고 배치만 다르다.
const ReviewDetail = ({ id, layout }: ReviewDetailProps) => {
  const { data: review, isPending, isError, refetch } = useReview(id);

  if (isPending) {
    return <p className="text-body-md text-text-secondary">검토 결과를 불러오는 중이에요…</p>;
  }
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-body-md text-text-danger">검토 결과를 불러오지 못했어요.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  const header = (
    <header className="flex flex-col gap-2">
      <span className="text-label-sm text-text-secondary">{entryLabelOf(review)}</span>
      <h1 className={`${layout === 'desk' ? 'text-h1' : 'text-h2'} text-text-heading`}>
        {review.part.name}
      </h1>
      <VerdictTags verdict={review.verdict} flags={review.flags} />
      <ComputedAt at={review.computed_at} />
    </header>
  );

  const opinion = (
    <Section title="검토 의견">
      <Opinion text={review.opinion} />
    </Section>
  );
  const comparison = (
    <Section title="원안 vs 수정안">
      <OrderComparison
        original={review.original}
        proposal={review.proposal}
        unit={review.part.unit}
        lossAvoided={review.risk_if_not_ordered.loss}
      />
    </Section>
  );
  const checks = (
    <Section title="걸린 체크와 근거">
      <CheckList checks={review.checks} unit={review.part.unit} />
    </Section>
  );
  const risk = (
    <Section title="발주하지 않으면">
      <Risk risk={review.risk_if_not_ordered} />
    </Section>
  );

  if (layout === 'mobile') {
    return (
      <div className="flex flex-col gap-4">
        {header}
        {opinion}
        {comparison}
        {checks}
        {risk}
        <div className="sticky bottom-0 -mx-4 border-t border-border-default bg-bg-surface px-4 pt-4 pb-safe">
          <div className="pb-4">
            <ApprovalActions review={review} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          {opinion}
          {checks}
          {/* TODO(W-03): 재고 예측 그래프(발주 시/미발주 시) — 차트 라이브러리 결정 후 */}
        </div>
        <div className="flex flex-col gap-6">
          {comparison}
          {risk}
          <Section title="결정">
            <ApprovalActions review={review} />
          </Section>
        </div>
      </div>
    </div>
  );
};

export default ReviewDetail;
