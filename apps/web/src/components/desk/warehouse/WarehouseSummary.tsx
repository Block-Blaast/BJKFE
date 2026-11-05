'use client';

import { AlertTriangle, ClipboardCheck, SearchCheck, Truck, type LucideIcon } from 'lucide-react';

import type { TwinLayout, TwinProjection } from '@bjk/api/types/twin';

import { useWarehouseBridge } from '@/hooks/twin/useWarehouseBridge';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { TWIN_SUMMARY_LABEL, locsByPart, twinSummary, type TwinSummaryKey } from '@/utils/twin';

type WarehouseSummaryProps = {
  layout: TwinLayout;
  projection: TwinProjection;
  withOrdersProjection: TwinProjection | undefined;
};

const CHIPS: { key: TwinSummaryKey; icon: LucideIcon; iconClass: string }[] = [
  { key: 'pending', icon: ClipboardCheck, iconClass: 'text-icon-brand' },
  { key: 'risk', icon: AlertTriangle, iconClass: 'text-icon-danger' },
  { key: 'suspect', icon: SearchCheck, iconClass: 'text-text-heading' },
  { key: 'arriving', icon: Truck, iconClass: 'text-icon-success' },
];

// 상단 요약 칩 — 누르면 해당 칸을 강조하고 그쪽으로 날아가 패널을 연다. 다시 누르면 강조를 푼다
const WarehouseSummary = ({ layout, projection, withOrdersProjection }: WarehouseSummaryProps) => {
  const day = useWarehouseStore((s) => s.day);
  const highlightLabel = useWarehouseStore((s) => s.highlightLabel);
  const bridge = useWarehouseBridge();

  const summary = twinSummary(projection, withOrdersProjection, day);
  const locsOf = locsByPart(layout.placements);

  return (
    <ul aria-label="창고 요약" className="flex flex-wrap gap-2">
      {CHIPS.map(({ key, icon: Icon, iconClass }) => {
        const label = TWIN_SUMMARY_LABEL[key];
        const partIds = summary[key];
        const on = highlightLabel === label;
        return (
          <li key={key}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() =>
                on
                  ? bridge.highlight([])
                  : bridge.focus(
                      partIds.flatMap((id) => locsOf.get(id) ?? []),
                      label,
                    )
              }
              className={`flex h-10 items-center gap-2 rounded-full px-4 text-label-md shadow-card transition-colors ${
                on
                  ? 'bg-bg-inverse text-text-on-inverse'
                  : 'bg-bg-surface text-text-body hover:bg-bg-subtle'
              }`}
            >
              <Icon size={16} aria-hidden className={on ? '' : iconClass} />
              {label}
              <span className="text-label-lg tabular-nums">{partIds.length}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default WarehouseSummary;
