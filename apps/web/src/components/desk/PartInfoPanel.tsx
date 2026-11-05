import { Layers, Package, Truck } from 'lucide-react';

import type { Part } from '@bjk/api/types/part';

import ComputedAt from '@/components/ui/ComputedAt';
import InfoPanel, { DotTag, InfoSection, MeterCard, PropertyList } from '@/components/ui/InfoPanel';
import Meter from '@/components/ui/Meter';
import { formatDate, formatQty, formatWon } from '@/utils/format';

const EMPTY = '—';

// 부품 정보 패널 (W-05). 재고 막대·속성·별칭을 한눈에 보여준다.
// 백엔드 상세(SET-04)에 보관 위치가 없고 입고 예정은 발주 기능 전이라 비어 있어 두 항목은 두지 않는다.
const PartInfoPanel = ({ part }: { part: Part }) => {
  const { metrics } = part;
  const belowReorder = metrics.reorder_point !== null && part.stock <= metrics.reorder_point;

  return (
    <InfoPanel title="정보">
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

      <InfoSection title="속성">
        <PropertyList
          items={[
            { label: '규격', value: part.spec ?? EMPTY },
            { label: '카테고리', value: part.category ?? EMPTY },
            { label: '기본 공급사', value: part.supplier?.name ?? EMPTY },
            {
              label: '단가',
              value:
                part.supplier?.unit_price === null || part.supplier?.unit_price === undefined
                  ? EMPTY
                  : formatWon(part.supplier.unit_price),
            },
            { label: '소진 예상', value: metrics.t_out ? formatDate(metrics.t_out) : EMPTY },
            {
              label: (
                <>
                  <Layers size={14} aria-hidden />
                  숨은 재고 (H)
                </>
              ),
              value: part.hidden_stock > 0 ? formatQty(part.hidden_stock, part.unit) : EMPTY,
              tone: part.hidden_stock > 0 ? 'warning' : undefined,
            },
          ]}
        />
        {metrics.computed_at ? <ComputedAt at={metrics.computed_at} className="self-end" /> : null}
      </InfoSection>

      <InfoSection title="별칭">
        {part.aliases.length === 0 ? (
          <p className="text-body-sm text-text-secondary">등록된 별칭이 없어요.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {part.aliases.map((alias) => (
              <DotTag key={alias} tone="brand">
                {alias}
              </DotTag>
            ))}
          </ul>
        )}
      </InfoSection>

      <p className="flex items-center gap-2 border-t border-border-default pt-4 text-label-sm text-text-secondary">
        {part.supplier ? <Truck size={14} aria-hidden /> : <Package size={14} aria-hidden />}
        {part.supplier
          ? `${part.supplier.name}에서 들여와요`
          : '기본 공급사가 없어요 — 기준 정보에서 등록할 수 있어요'}
      </p>
    </InfoPanel>
  );
};

export default PartInfoPanel;
