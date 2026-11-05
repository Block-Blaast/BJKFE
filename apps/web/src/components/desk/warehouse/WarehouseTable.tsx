'use client';

import type { TwinBin, TwinPlacement, TwinRack } from '@bjk/api/types/twin';

import ErrorState from '@/components/ui/ErrorState';
import { DotTag } from '@/components/ui/InfoPanel';
import Segmented from '@/components/ui/Segmented';
import { TABLE, TABLE_CARD, TD, TH, TR } from '@/components/ui/table';
import { useParts } from '@/hooks/part/useParts';
import { useTwinLayout, useTwinProjection } from '@/hooks/twin/useTwinLayout';
import { useWarehouseBridge } from '@/hooks/twin/useWarehouseBridge';
import { useWarehouseStore, type WarehouseView } from '@/stores/warehouseStore';
import { formatQty } from '@/utils/format';
import { BIN_LOOK_LABEL, binLook, LOOK_TONE, TODAY, type TwinLayers } from '@/utils/twin';

// 표는 층 토글과 무관하게 칸의 실제 상태를 모두 보여준다
const ALL_LAYERS: TwinLayers = {
  status: true,
  hidden: true,
  suspect: true,
  impact: true,
  dock: true,
};

const VIEW_OPTIONS = [
  ['3d', '3D'],
  ['table', '표'],
] as const satisfies readonly (readonly [WarehouseView, string])[];

// 3D 씬(warehouse-3d.html)이 칸을 부르는 이름과 같아야 브릿지가 찾는다
const locKey = (p: TwinPlacement) => `${p.rack_id}-${p.level}-${p.slot}`;

// mocks/fixtures/factory.ts 의 formatLocation 과 같은 규칙 — 앱은 mocks 를 import 하지 않는다
const formatLocation = (rack: TwinRack | undefined, p: TwinPlacement) =>
  rack && rack.levels === 1
    ? `${rack.label} ${p.slot}칸`
    : `${p.rack_id}선반 ${p.level}단 ${p.slot}칸`;

// 3D <-> 표 전환. WarehouseView(오버레이)가 꽂는다
export const WarehouseViewToggle = () => {
  const view = useWarehouseStore((s) => s.view);
  const setView = useWarehouseStore((s) => s.setView);
  return <Segmented label="창고 보기" options={VIEW_OPTIONS} value={view} onChange={setView} />;
};

// 3D 창고(W-11)의 표 보기. canvas 는 키보드로 칸을 고를 수 없어 이 표가 키보드·화면 읽기 사용자의 유일한 길이다.
// 그래서 칸으로 가는 조작은 모두 button 이다.
const WarehouseTable = () => {
  const selectedLoc = useWarehouseStore((s) => s.selectedLoc);
  const setSelectedLoc = useWarehouseStore((s) => s.setSelectedLoc);
  const setView = useWarehouseStore((s) => s.setView);
  const bridge = useWarehouseBridge();

  const layout = useTwinLayout();
  const projection = useTwinProjection(false);
  const parts = useParts({});

  if (layout.isError || projection.isError || parts.isError) {
    return (
      <ErrorState
        title="창고 표를 불러오지 못했어요"
        onRetry={() => {
          void layout.refetch();
          void projection.refetch();
          void parts.refetch();
        }}
      />
    );
  }
  if (layout.isPending || projection.isPending || parts.isPending) {
    return <p className="text-body-md text-text-secondary">창고 표를 불러오는 중이에요…</p>;
  }

  const partOf = new Map(parts.data.map((p) => [p.id, p]));
  const rackOf = new Map(layout.data.racks.map((r) => [r.id, r]));
  const placementsOf = new Map<string, TwinPlacement[]>();
  for (const pl of layout.data.placements) {
    placementsOf.set(pl.part_id, [...(placementsOf.get(pl.part_id) ?? []), pl]);
  }
  // 같은 규격 묶음 값이 두 칸 이상에 있을 때만 숨은 재고다 (F-MATCH-03)
  const groupSize = new Map<string, number>();
  for (const b of projection.data.bins) {
    if (b.same_spec_group) {
      groupSize.set(b.same_spec_group, (groupSize.get(b.same_spec_group) ?? 0) + 1);
    }
  }
  const isHidden = (b: TwinBin) =>
    b.same_spec_group !== null && (groupSize.get(b.same_spec_group) ?? 0) > 1;

  const goTo = (loc: string) => {
    setSelectedLoc(loc);
    setView('3d');
    bridge.select(loc);
    bridge.flyTo({ locs: [loc] });
  };

  return (
    <div className={TABLE_CARD}>
      <table className={`${TABLE} tabular-nums`}>
        <caption className="sr-only">
          오늘 기준 칸별 재고. 칸 위치 버튼을 누르면 3D에서 그 칸으로 이동합니다.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={`${TH} text-left`}>
              칸 위치
            </th>
            <th scope="col" className={`${TH} text-left`}>
              부품
            </th>
            <th scope="col" className={`${TH} text-right`}>
              현재 재고
            </th>
            <th scope="col" className={`${TH} text-right`}>
              재주문점
            </th>
            <th scope="col" className={`${TH} text-left`}>
              상태
            </th>
            <th scope="col" className={`${TH} text-right`}>
              결품 확률
            </th>
            <th scope="col" className={`${TH} text-left`}>
              숨은 재고
            </th>
            <th scope="col" className={`${TH} text-left`}>
              장부 의심
            </th>
          </tr>
        </thead>
        <tbody>
          {projection.data.bins.map((b) => {
            const part = partOf.get(b.part_id);
            const unit = part?.unit ?? '';
            const look = binLook(b, ALL_LAYERS);
            const placements = placementsOf.get(b.part_id) ?? [];
            return (
              <tr key={b.part_id} className={TR}>
                <td className={TD}>
                  {placements.length === 0 ? (
                    <span className="text-text-secondary">—</span>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {placements.map((pl) => {
                        const loc = locKey(pl);
                        const label = formatLocation(rackOf.get(pl.rack_id), pl);
                        return (
                          <li key={loc}>
                            <button
                              type="button"
                              onClick={() => goTo(loc)}
                              aria-current={selectedLoc === loc ? 'true' : undefined}
                              aria-label={`${label} — 3D에서 보기`}
                              className={`rounded-md text-label-md hover:text-text-brand focus-visible:outline-2 focus-visible:outline-border-brand ${selectedLoc === loc ? 'text-text-brand' : 'text-text-heading'}`}
                            >
                              {label}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </td>
                <td className={`${TD} text-text-body`}>{part?.name ?? b.part_id}</td>
                <td className={`${TD} text-right text-text-heading`}>
                  {formatQty(Math.round(b.qty[TODAY] * 10) / 10, unit)}
                </td>
                <td className={`${TD} text-right text-text-body`}>
                  {b.reorder_point === null ? '—' : formatQty(b.reorder_point, unit)}
                </td>
                <td className={TD}>
                  <DotTag as="span" tone={LOOK_TONE[look]}>
                    {BIN_LOOK_LABEL[look]}
                  </DotTag>
                </td>
                <td className={`${TD} text-right text-text-body`}>
                  {Math.round(b.p_out[TODAY] * 100)}%
                </td>
                <td className={`${TD} text-text-body`}>{isHidden(b) ? '있음' : '—'}</td>
                <td className={`${TD} text-text-body`}>{b.audit ? b.audit.reason : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default WarehouseTable;
