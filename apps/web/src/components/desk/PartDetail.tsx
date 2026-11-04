'use client';

import { CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';

import { DEMAND_PATTERNS, MOVEMENT_TYPES } from '@bjk/api/domain/part';
import type { PartMetrics } from '@bjk/api/types/part';
import Button from '@bjk/ui/components/Button';

import Tag from '@/components/ui/Tag';
import ComputedAt from '@/components/ui/ComputedAt';
import { usePart, usePartLedger } from '@/hooks/part/useParts';
import { factLabel, formatFact } from '@/utils/facts';
import { formatComputedAt, formatDate, formatQty, formatWon } from '@/utils/format';

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
  <section className="flex flex-col gap-3 rounded-md bg-bg-surface p-5 shadow-card">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-label-lg text-text-heading">{title}</h2>
      {aside}
    </div>
    {children}
  </section>
);

const Stat = ({
  label,
  value,
  tone = 'text-text-heading',
}: {
  label: string;
  value: string;
  tone?: string;
}) => (
  <div className="flex flex-1 flex-col gap-1 rounded-md bg-bg-surface p-5 shadow-card">
    <span className="text-label-sm text-text-secondary">{label}</span>
    <span className={`text-h2 tabular-nums ${tone}`}>{value}</span>
  </div>
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
    <table className="w-full text-body-sm">
      <thead className="text-label-sm text-text-secondary">
        <tr>
          <th scope="col" className="py-2 text-left font-medium">
            시각
          </th>
          <th scope="col" className="py-2 text-left font-medium">
            구분
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            수량
          </th>
          <th scope="col" className="py-2 pl-6 text-left font-medium">
            원문 · 사유
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} className="border-t border-border-default">
            <td className="py-2 text-text-secondary tabular-nums">
              {formatComputedAt(entry.created_at)}
            </td>
            <td className="py-2 text-text-body">{MOVEMENT_TYPES[entry.type]}</td>
            <td
              className={`py-2 text-right tabular-nums ${entry.qty < 0 ? 'text-text-danger' : 'text-text-body'}`}
            >
              {entry.qty > 0 ? '+' : ''}
              {formatQty(entry.qty, unit)}
            </td>
            <td className="py-2 pl-6 text-text-body">
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

// 부품 상세 (W-05). 재고, 근거 지표와 계산 근거, 입출고 원문, 별칭.
// TODO(W-05): 재고 추이 + 예측선 그래프 — 차트 라이브러리 결정 후
const PartDetail = ({ id }: PartDetailProps) => {
  const { data: part, isPending, isError, refetch } = usePart(id);

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
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 text-text-heading">{part.name}</h1>
        <p className="text-body-md text-text-secondary">
          {[
            part.spec && `규격 ${part.spec}`,
            part.category,
            part.location && `보관 ${part.location}`,
            part.supplier &&
              `기본 공급사 ${part.supplier.name}${part.supplier.unit_price ? ` · ${formatWon(part.supplier.unit_price)}` : ''}`,
          ]
            .filter(Boolean)
            .join(' · ') || '기본 정보가 아직 없어요.'}
        </p>
      </header>

      <div className="flex gap-4">
        <Stat label="현재 재고 (S)" value={formatQty(part.stock, part.unit)} />
        <Stat
          label="입고 예정 (O)"
          value={
            part.incoming
              ? `${formatQty(part.incoming.qty, part.unit)} · ${formatDate(part.incoming.eta)}`
              : EMPTY
          }
        />
        <Stat
          label="숨은 재고 (H)"
          value={part.hidden_stock > 0 ? formatQty(part.hidden_stock, part.unit) : EMPTY}
          tone={part.hidden_stock > 0 ? 'text-text-warning' : 'text-text-heading'}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
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

        <div className="flex flex-col gap-6">
          <Section title="별칭">
            {part.aliases.length === 0 ? (
              <p className="text-body-sm text-text-secondary">등록된 별칭이 없어요.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {part.aliases.map((alias) => (
                  <li
                    key={alias}
                    className="rounded-md bg-bg-subtle px-3 py-1 text-label-sm text-text-body"
                  >
                    {alias}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
};

export default PartDetail;
