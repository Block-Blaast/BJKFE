'use client';

import { ChevronRight } from 'lucide-react';

import type { Part } from '@bjk/api/types/part';
import type { TwinLayout, TwinProjection } from '@bjk/api/types/twin';

import InfoPanel, { DotTag, InfoSection } from '@/components/ui/InfoPanel';
import { useWarehouseBridge } from '@/hooks/twin/useWarehouseBridge';
import { useWarehouseStore } from '@/stores/warehouseStore';
import {
  BIN_LOOK_LABEL,
  EQUIPMENT_STATUS_LABEL,
  LOOK_ORDER,
  LOOK_TONE,
  binLook,
  locsByPart,
  twinLoc,
  TODAY,
} from '@/utils/twin';

import { BIN_SECTIONS, OVERVIEW_SECTIONS, PANEL_TOP_SLOTS } from './panel/slots';
import { BinPanel, EquipmentPanel } from './TwinPanel';

type WarehousePanelProps = {
  layout: TwinLayout;
  projection: TwinProjection;
  parts: Part[];
};

const ROW =
  'flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-bg-subtle';

// 오른쪽 패널 — 선택한 칸 / 설비 / 아무것도 안 골랐을 때(주의할 칸) 중 하나.
// 기능 섹션은 여기서 직접 늘리지 않고 panel/slots.ts 에 한 줄씩 꽂는다 (panel/README.md).
const WarehousePanel = ({ layout, projection, parts }: WarehousePanelProps) => {
  const selectedLoc = useWarehouseStore((s) => s.selectedLoc);
  const selectedEquipmentId = useWarehouseStore((s) => s.selectedEquipmentId);
  const highlighted = useWarehouseStore((s) => s.highlighted);
  const highlightLabel = useWarehouseStore((s) => s.highlightLabel);
  const selectEquipment = useWarehouseStore((s) => s.selectEquipment);
  const bridge = useWarehouseBridge();

  const ctx = { layout, projection };
  const partOf = new Map(parts.map((p) => [p.id, p]));
  const binOf = new Map(projection.bins.map((b) => [b.part_id, b]));
  const partAt = new Map(layout.placements.map((pl) => [twinLoc(pl), pl.part_id]));
  const locsOf = locsByPart(layout.placements);
  const partName = (id: string) => partOf.get(id)?.name ?? id;
  const equipmentOf = new Map(projection.equipment.map((e) => [e.equipment_id, e]));

  const top = PANEL_TOP_SLOTS.map((Slot, i) => <Slot key={i} />);

  const selectedPartId = selectedLoc ? partAt.get(selectedLoc) : undefined;
  const bin = selectedPartId ? binOf.get(selectedPartId) : undefined;
  const part = selectedPartId ? partOf.get(selectedPartId) : undefined;
  if (selectedLoc && bin && part) {
    return (
      <>
        {top}
        <BinPanel
          part={part}
          bin={bin}
          look={binLook(bin)}
          equipmentNames={layout.equipment
            .filter((e) => e.part_ids.includes(part.id))
            .map((e) => e.name)}
          arrivals={projection.arrivals.filter((a) => a.part_id === part.id)}
          sameSpec={projection.bins
            .filter(
              (b) =>
                b.part_id !== bin.part_id &&
                b.same_spec_group !== null &&
                b.same_spec_group === bin.same_spec_group,
            )
            .flatMap((b) => {
              const p = partOf.get(b.part_id);
              return p ? [{ part: p, qty: b.qty[TODAY] }] : [];
            })}
          onClose={() => bridge.select(null)}
          sections={BIN_SECTIONS.map((Section, i) => (
            <Section key={i} {...ctx} loc={selectedLoc} part={part} bin={bin} />
          ))}
        />
      </>
    );
  }

  const equipment = selectedEquipmentId
    ? layout.equipment.find((e) => e.id === selectedEquipmentId)
    : undefined;
  const equipmentProjection = equipment ? equipmentOf.get(equipment.id) : undefined;
  if (equipment && equipmentProjection) {
    return (
      <>
        {top}
        <EquipmentPanel
          name={equipment.name}
          projection={equipmentProjection}
          partName={partName}
          usedParts={equipment.part_ids}
          onClose={() => selectEquipment(null)}
        />
      </>
    );
  }

  // 칩·검색으로 강조한 칸이 있으면 그 목록, 없으면 지금 날짜의 주의할 칸
  const highlightedParts = [
    ...new Set(highlighted.flatMap((loc) => partAt.get(loc) ?? [])),
  ].flatMap((id) => binOf.get(id) ?? []);
  const rows = (
    highlighted.length ? highlightedParts : projection.bins.filter((b) => binLook(b) !== 'normal')
  )
    .map((b) => ({ b, look: binLook(b) }))
    .sort((a, b) => LOOK_ORDER[a.look] - LOOK_ORDER[b.look]);

  const troubled = layout.equipment.filter(
    (e) => (equipmentOf.get(e.id)?.status[TODAY] ?? 'normal') !== 'normal',
  );

  return (
    <>
      {top}
      <InfoPanel title={highlightLabel ?? '주의할 칸'}>
        <InfoSection title={`칸 ${rows.length}개`}>
          {rows.length ? (
            <ul className="flex flex-col gap-1">
              {rows.map(({ b, look }) => {
                const loc = locsOf.get(b.part_id)?.[0];
                return (
                  <li key={b.part_id}>
                    <button
                      type="button"
                      disabled={!loc}
                      onClick={() => loc && bridge.goTo(loc)}
                      className={ROW}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-label-md text-text-heading">
                          {partName(b.part_id)}
                        </span>
                        <span className="text-label-sm text-text-secondary">
                          {partOf.get(b.part_id)?.location ?? loc}
                        </span>
                      </span>
                      <DotTag as="span" tone={LOOK_TONE[look]}>
                        {BIN_LOOK_LABEL[look]}
                      </DotTag>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-body-sm text-text-secondary">지금은 주의할 칸이 없어요.</p>
          )}
        </InfoSection>
        {troubled.length ? (
          <InfoSection title="설비 영향">
            <ul className="flex flex-col gap-1">
              {troubled.map((e) => {
                const status = equipmentOf.get(e.id)?.status[TODAY] ?? 'normal';
                return (
                  <li key={e.id}>
                    <button type="button" onClick={() => selectEquipment(e.id)} className={ROW}>
                      <span className="truncate text-label-md text-text-heading">{e.name}</span>
                      <span className="flex items-center gap-1">
                        <DotTag as="span" tone={status === 'down' ? 'danger' : 'warning'}>
                          {EQUIPMENT_STATUS_LABEL[status]}
                        </DotTag>
                        <ChevronRight size={16} aria-hidden className="text-text-secondary" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </InfoSection>
        ) : null}
        {OVERVIEW_SECTIONS.map((Section, i) => (
          <Section key={i} {...ctx} />
        ))}
      </InfoPanel>
    </>
  );
};

export default WarehousePanel;
