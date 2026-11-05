import { Layers, Package, Truck } from 'lucide-react';
import type { ReactNode } from 'react';

import type { Part } from '@bjk/api/types/part';

import ComputedAt from '@/components/ui/ComputedAt';
import Meter from '@/components/ui/Meter';
import { formatDate, formatQty, formatWon } from '@/utils/format';

const EMPTY = '—';

const MeterCard = ({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: string;
  note?: ReactNode;
  children?: ReactNode;
}) => (
  <div className="flex flex-col gap-2 rounded-md border border-border-default bg-bg-surface p-4">
    <span className="text-label-md text-text-secondary">{label}</span>
    <span className="text-h2 text-text-heading">{value}</span>
    {children}
    {note ? <span className="text-label-sm text-text-secondary">{note}</span> : null}
  </div>
);

// 부품 정보 패널 (W-05, 참고: Kintsugi Info). 오른쪽에 붙어 재고 막대·속성·별칭을 한눈에 보여준다.
const PartInfoPanel = ({ part }: { part: Part }) => {
  const { metrics } = part;
  const belowReorder = metrics.reorder_point !== null && part.stock <= metrics.reorder_point;

  const properties: [string, ReactNode][] = [
    ['규격', part.spec ?? EMPTY],
    ['카테고리', part.category ?? EMPTY],
    ['보관 위치', part.location ?? EMPTY],
    ['기본 공급사', part.supplier?.name ?? EMPTY],
    [
      '단가',
      part.supplier?.unit_price === null || part.supplier?.unit_price === undefined
        ? EMPTY
        : formatWon(part.supplier.unit_price),
    ],
    [
      '입고 예정',
      part.incoming
        ? `${formatQty(part.incoming.qty, part.unit)} · ${formatDate(part.incoming.eta)}`
        : EMPTY,
    ],
    ['소진 예상', metrics.t_out ? formatDate(metrics.t_out) : EMPTY],
  ];

  return (
    <aside className="flex flex-col gap-6 rounded-xl bg-bg-surface p-6 shadow-card">
      <h2 className="text-h3 text-text-heading">정보</h2>

      <div className="flex flex-col gap-3">
        <MeterCard
          label="현재 재고 (S)"
          value={formatQty(part.stock, part.unit)}
          note={
            metrics.D95 === null
              ? '기간 필요량이 아직 계산되지 않았어요'
              : `기간 필요량(상위 95%) ${formatQty(metrics.D95, part.unit)} 대비${
                  metrics.reorder_point === null
                    ? ''
                    : ` · 재주문점 ${formatQty(metrics.reorder_point, part.unit)}`
                }`
          }
        >
          {metrics.D95 ? (
            <Meter
              label="기간 필요량 대비 현재 재고"
              ratio={part.stock / metrics.D95}
              tone={belowReorder ? 'danger' : 'brand'}
            />
          ) : null}
        </MeterCard>
        <MeterCard
          label="결품 확률"
          value={metrics.p_out === null ? EMPTY : `${Math.round(metrics.p_out * 100)}%`}
          note="다음 입고 가능일까지"
        >
          {metrics.p_out === null ? null : (
            <Meter label="결품 확률" ratio={metrics.p_out} tone="danger" />
          )}
        </MeterCard>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-label-lg text-text-heading">속성</h3>
        <dl className="flex flex-col gap-3">
          {properties.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4">
              <dt className="shrink-0 text-body-sm text-text-secondary">{label}</dt>
              <dd className="truncate text-label-md text-text-heading tabular-nums">{value}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4">
            <dt className="flex items-center gap-2 text-body-sm text-text-secondary">
              <Layers size={14} aria-hidden />
              숨은 재고 (H)
            </dt>
            <dd
              className={`text-label-md tabular-nums ${part.hidden_stock > 0 ? 'text-text-warning' : 'text-text-heading'}`}
            >
              {part.hidden_stock > 0 ? formatQty(part.hidden_stock, part.unit) : EMPTY}
            </dd>
          </div>
        </dl>
        {metrics.computed_at ? <ComputedAt at={metrics.computed_at} className="self-end" /> : null}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-label-lg text-text-heading">별칭</h3>
        {part.aliases.length === 0 ? (
          <p className="text-body-sm text-text-secondary">등록된 별칭이 없어요.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {part.aliases.map((alias) => (
              <li
                key={alias}
                className="flex items-center gap-2 rounded-md border border-border-default px-2 py-1 text-label-sm text-text-body"
              >
                <span aria-hidden className="size-1.5 rounded-full bg-bg-brand" />
                {alias}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-center gap-2 border-t border-border-default pt-4 text-label-sm text-text-secondary">
        {part.supplier ? <Truck size={14} aria-hidden /> : <Package size={14} aria-hidden />}
        {part.supplier
          ? `${part.supplier.name}에서 들여와요`
          : '기본 공급사가 없어요 — 기준 정보에서 등록할 수 있어요'}
      </p>
    </aside>
  );
};

export default PartInfoPanel;
