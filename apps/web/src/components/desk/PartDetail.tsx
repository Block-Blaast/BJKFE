'use client';

import type { ReactNode } from 'react';

import { MOVEMENT_TYPES } from '@bjk/api/domain/part';

import ErrorState from '@/components/ui/ErrorState';
import ForecastPanel from '@/components/charts/ForecastPanel';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { usePart, usePartForecast, usePartLedger } from '@/hooks/part/useParts';
import { formatComputedAt, formatQty } from '@/utils/format';
import { TABLE, TD, TH, TR } from '@/components/ui/table';

import PartInfoPanel from './PartInfoPanel';
import PartMetrics from './PartMetrics';

const EMPTY = '—';

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
      <ErrorState title="입출고 원문을 불러오지 못했어요" onRetry={() => refetch()} size="inline" />
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

// 부품 상세 (W-05). 가운데에 그래프·발주 판단·상세 분석·입출고 원문, 오른쪽 정보 패널에 재고·속성·별칭.
const PartDetail = ({ id }: PartDetailProps) => {
  const { data: part, isPending, isError, refetch } = usePart(id);
  const forecast = usePartForecast(id);

  if (isPending)
    return <p className="text-body-md text-text-secondary">부품을 불러오는 중이에요…</p>;
  if (isError) {
    return <ErrorState title="부품을 불러오지 못했어요" onRetry={() => refetch()} />;
  }

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
          <PartMetrics part={part} />

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
