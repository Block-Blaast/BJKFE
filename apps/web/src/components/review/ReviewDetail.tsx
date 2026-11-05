'use client';

import { FileText, Sparkles } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { openReviewPdf } from '@bjk/api/reviews';
import type { Review } from '@bjk/api/types/review';
import Button from '@bjk/ui/components/Button';

import ErrorState from '@/components/ui/ErrorState';
import Breadcrumb from '@/components/ui/Breadcrumb';
import ComputedAt from '@/components/ui/ComputedAt';
import Tag from '@/components/ui/Tag';
import ForecastPanel from '@/components/charts/ForecastPanel';
import { useReview, useReviewForecast } from '@/hooks/review/useReview';
import { formatDate, formatWon } from '@/utils/format';

import ApprovalActions from './ApprovalActions';
import { entryLabelOf } from './labels';
import CheckList from './CheckList';
import OrderComparison from './OrderComparison';
import ReviewInfoPanel from './ReviewInfoPanel';
import VerdictTags from './VerdictTags';

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-4 rounded-xl bg-bg-surface p-6 shadow-card">
    <h2 className="text-h3 text-text-heading">{title}</h2>
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

// 결재용 PDF (F-APPROVAL-04) — 백엔드가 승인 뒤 만든다
const PdfButton = ({ id }: { id: string }) => {
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle');
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        disabled={state === 'loading'}
        onClick={() => {
          setState('loading');
          openReviewPdf(id).then(
            () => setState('idle'),
            () => setState('failed'),
          );
        }}
      >
        <FileText size={16} aria-hidden />
        {state === 'loading' ? 'PDF 여는 중…' : '결재용 PDF'}
      </Button>
      {state === 'failed' ? (
        <p role="alert" className="text-body-sm text-text-danger">
          PDF를 열지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      ) : null}
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

// 그래프는 PC(W-03)에서만 — 폰 의견서(M-05)에는 명세서상 그래프가 없다
const DeskForecast = ({ id }: { id: string }) => <ForecastPanel query={useReviewForecast(id)} />;

type ReviewDetailProps = {
  id: string;
  layout: 'mobile' | 'desk';
};

// 의견서·승인 (M-05) 과 검토 상세 (W-03) 가 같이 쓰는 본문. 데이터는 같고 배치만 다르다.
// PC 는 가운데 본문 + 오른쪽(결정 → 정보 패널). 미발주 위험은 정보 패널이 보여준다.
const ReviewDetail = ({ id, layout }: ReviewDetailProps) => {
  const { data: review, isPending, isError, refetch } = useReview(id);

  if (isPending) {
    return <p className="text-body-md text-text-secondary">검토 결과를 불러오는 중이에요…</p>;
  }
  if (isError) {
    return <ErrorState title="검토 결과를 불러오지 못했어요" onRetry={() => refetch()} />;
  }

  const header = (
    <header className="flex flex-col gap-2">
      {layout === 'desk' ? (
        <div className="pb-2">
          <Breadcrumb parent={{ href: '/reviews', label: '검토함' }} current={review.part.name} />
        </div>
      ) : null}
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
      {review.opinion_source === 'llm' ? (
        <span className="w-fit">
          <Tag tone="brand" icon={Sparkles}>
            AI 작성
          </Tag>
        </span>
      ) : null}
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
          {comparison}
          {checks}
          <DeskForecast id={review.id} />
        </div>
        <div className="flex flex-col gap-6">
          <Section title="결정">
            <ApprovalActions review={review} />
            {review.status === '발주됨' ? <PdfButton id={review.id} /> : null}
          </Section>
          <ReviewInfoPanel review={review} />
        </div>
      </div>
    </div>
  );
};

export default ReviewDetail;
