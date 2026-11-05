'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ClipboardCheck,
  LayoutList,
  SearchCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';

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

// 상단 창고 현황 — 3D 를 덜 가리게 버튼 하나로 두고, 누르면 네 항목이 펼쳐진다(WarehouseMenu 와 같은 모양).
// 항목을 고르면 해당 칸을 강조하고 그쪽으로 날아가 패널을 연다. 고른 항목을 다시 누르면 강조를 푼다.
// 강조 중에는 버튼이 그 항목 이름·개수를 보여 줘 무엇을 비추는지 닫힌 채로도 알 수 있다. Esc·바깥 클릭으로 닫는다.
const WarehouseSummary = ({ layout, projection, withOrdersProjection }: WarehouseSummaryProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const highlightLabel = useWarehouseStore((s) => s.highlightLabel);

  const highlighted = useWarehouseStore((s) => s.highlighted);
  const bridge = useWarehouseBridge();
  const { highlight } = bridge;

  const summary = twinSummary(projection, withOrdersProjection);
  const locsOf = locsByPart(layout.placements);
  const locsFor = (key: TwinSummaryKey) => summary[key].flatMap((id) => locsOf.get(id) ?? []);

  // 켜 둔 항목의 칸이 바뀌면(승인·채팅 기록) 강조도 따라간다. 카메라는 옮기지 않는다
  const active = CHIPS.find(({ key }) => TWIN_SUMMARY_LABEL[key] === highlightLabel);
  const activeKey = active?.key;
  const activeLocs = activeKey ? locsFor(activeKey).join(',') : null;
  useEffect(() => {
    if (!activeKey || activeLocs === null || activeLocs === highlighted.join(',')) return;
    highlight(activeLocs ? activeLocs.split(',') : [], TWIN_SUMMARY_LABEL[activeKey]);
  }, [activeKey, activeLocs, highlighted, highlight]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const TriggerIcon = active?.icon ?? LayoutList;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="warehouse-summary"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 items-center gap-2 rounded-full px-4 text-label-md shadow-card transition-colors ${
          active
            ? 'bg-bg-inverse text-text-on-inverse'
            : 'bg-bg-surface text-text-heading hover:bg-bg-subtle'
        }`}
      >
        <TriggerIcon size={16} aria-hidden />
        {active ? TWIN_SUMMARY_LABEL[active.key] : '창고 현황'}
        {active ? (
          <span className="text-label-lg tabular-nums">{summary[active.key].length}</span>
        ) : null}
        <ChevronDown size={16} aria-hidden />
      </button>

      {open ? (
        <ul
          id="warehouse-summary"
          aria-label="창고 현황"
          className="absolute top-12 left-0 z-10 flex w-64 flex-col rounded-xl bg-bg-surface p-2 shadow-card"
        >
          {CHIPS.map(({ key, icon: Icon, iconClass }) => {
            const label = TWIN_SUMMARY_LABEL[key];
            const on = highlightLabel === label;
            return (
              <li key={key}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    if (on) bridge.highlight([]);
                    else bridge.focus(locsFor(key), label);
                    setOpen(false);
                  }}
                  className={`flex h-10 w-full items-center gap-2 rounded-md px-2 text-label-md transition-colors hover:bg-bg-subtle hover:text-text-heading ${
                    on ? 'bg-bg-subtle text-text-heading' : 'text-text-body'
                  }`}
                >
                  <Icon size={16} aria-hidden className={iconClass} />
                  <span className="flex-1 text-left">{label}</span>
                  <span className="text-label-lg text-text-heading tabular-nums">
                    {summary[key].length}
                  </span>
                  {on ? <Check size={16} aria-hidden className="text-icon-brand" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

export default WarehouseSummary;
