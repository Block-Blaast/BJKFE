'use client';

import { CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';

import { DEMAND_PATTERNS, MOVEMENT_TYPES } from '@bjk/api/domain/part';
import type { PartMetrics } from '@bjk/api/types/part';
import Button from '@bjk/ui/components/Button';

import ForecastPanel from '@/components/charts/ForecastPanel';
import Tag from '@/components/ui/Tag';
import ComputedAt from '@/components/ui/ComputedAt';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { usePart, usePartForecast, usePartLedger } from '@/hooks/part/useParts';
import { factLabel, formatFact } from '@/utils/facts';
import { formatComputedAt, formatQty } from '@/utils/format';
import { TABLE, TD, TH, TR } from '@/components/ui/table';

import PartInfoPanel from './PartInfoPanel';

const EMPTY = '—';

// 부품 상세에 보여줄 근거 지표와 순서 (F-ANAL, F-REVIEW-02 기호)
const METRIC_KEYS = [
  'm',
  'D95',
  'D99',
  'reorder_point',
  'R',
  'LT50',
  'LT90',
  't_out',
  't_deadline',
] as const satisfies readonly (keyof PartMetrics)[];

const Section = ({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-4 rounded-xl bg-bg-surface p-6 shadow-card">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-h3 text-text-heading">{title}</h2>
      {aside}
    </div>
    {children}
  </section>
);

const Ledger = ({ id, unit }: { id: string; unit: string }) => {
  const { data: entries, isPending, isError, refetch } = usePartLedger(id);
  if (isPending)
    return <p className="text-body-sm text-text-secondary">원장을 불러오는 중이에요…</p>;
  if (isError) {
    return (
      <Button variant="secondary" onClick={() => refetch()}>
        원장 다시 불러오기
      </Button>
    );
  }
  if (entries.length === 0) {
    return <p className="text-body-sm text-text-secondary">아직 기록이 없어요.</p>;
  }
  return (
    <table className={TABLE}>
      <thead>
        <tr>
          <th scope="col" className={`${TH} text-left`}>
            시각
          </th>
          <th scope="col" className={`${TH} text-left`}>
            구분
          </th>
          <th scope="col" className={`${TH} text-right`}>
            수량
          </th>
          <th scope="col" className={`${TH} text-left`}>
            원문 · 사유
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} className={TR}>
            <td className={`${TD} text-text-secondary tabular-nums`}>
              {formatComputedAt(entry.created_at)}
            </td>
            <td className={`${TD} text-text-body`}>{MOVEMENT_TYPES[entry.type]}</td>
            <td
              className={`${TD} text-right tabular-nums ${entry.qty < 0 ? 'text-text-danger' : 'text-text-body'}`}
            >
              {entry.qty > 0 ? '+' : ''}
              {formatQty(entry.qty, unit)}
            </td>
            <td className={`${TD} text-text-body`}>
              {entry.message ? <q>{entry.message}</q> : null}
              {entry.message && entry.reason ? ' · ' : null}
              {entry.reason ?? (entry.message ? null : EMPTY)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

type PartDetailProps = {
  id: string;
};

// 부품 상세 (W-05). 가운데에 그래프·근거 지표·입출고 원문, 오른쪽 정보 패널에 재고·속성·별칭.
const PartDetail = ({ id }: PartDetailProps) => {
  const { data: part, isPending, isError, refetch } = usePart(id);
  const forecast = usePartForecast(id);

  if (isPending)
    return <p className="text-body-md text-text-secondary">부품을 불러오는 중이에요…</p>;
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-body-md text-text-danger">부품을 불러오지 못했어요.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  const { metrics } = part;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <Breadcrumb parent={{ href: '/parts', label: '부품' }} current={part.name} />
        <div className="flex flex-col gap-1">
          <h1 className="text-h1 text-text-heading">{part.name}</h1>
          <p className="text-body-md text-text-secondary">
            {[part.spec && `규격 ${part.spec}`, part.category].filter(Boolean).join(' · ') ||
              '기본 정보가 아직 없어요.'}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <ForecastPanel query={forecast} />
          <Section
            title="근거 지표"
            aside={
              <div className="flex items-center gap-2">
                {metrics.estimated ? (
                  <Tag tone="warning" icon={CircleHelp}>
                    추정치 기반
                  </Tag>
                ) : null}
                {metrics.computed_at ? <ComputedAt at={metrics.computed_at} /> : null}
              </div>
            }
          >
            <dl className="grid grid-cols-3 gap-x-6 gap-y-3">
              <div className="flex flex-col gap-1">
                <dt className="text-label-sm text-text-secondary">ABC 등급</dt>
                <dd className="text-body-md text-text-heading">{metrics.abc ?? EMPTY}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-label-sm text-text-secondary">수요 유형</dt>
                <dd className="text-body-md text-text-heading">
                  {metrics.demand_pattern ? DEMAND_PATTERNS[metrics.demand_pattern] : EMPTY}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-label-sm text-text-secondary">외부 요인 위험도</dt>
                <dd className="text-body-md text-text-heading">{part.risk ?? EMPTY}</dd>
              </div>
              {METRIC_KEYS.map((key) => {
                const value = metrics[key];
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <dt className="text-label-sm text-text-secondary">
                      {factLabel(key)} <span className="text-text-placeholder">{key}</span>
                    </dt>
                    <dd className="text-body-md text-text-heading tabular-nums">
                      {value === null ? EMPTY : formatFact(key, value, part.unit)}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {metrics.estimated ? (
              <p className="text-body-sm text-text-secondary">
                사용 기록이 쌓이기 전이라 월 사용 추정치와 정비 일정으로 계산했어요.
              </p>
            ) : null}
          </Section>

          <Section title="입출고 원문">
            <Ledger id={part.id} unit={part.unit} />
          </Section>
        </div>

        <div>
          <PartInfoPanel part={part} />
        </div>
      </div>
    </div>
  );
};

export default PartDetail;
