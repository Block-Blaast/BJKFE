'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

import { CATEGORIES, type Category } from '@bjk/api/domain/part';
import type { TwinBin, TwinPlacement, TwinRack } from '@bjk/api/types/twin';

import { PILL_SEARCH } from '@/components/ui/controls';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { DotTag } from '@/components/ui/InfoPanel';
import Segmented from '@/components/ui/Segmented';
import Select from '@/components/ui/Select';
import { TABLE, TABLE_CARD, TD, TH, TR } from '@/components/ui/table';
import { useParts } from '@/hooks/part/useParts';
import { useTwinLayout, useTwinProjection } from '@/hooks/twin/useTwinLayout';
import { useWarehouseBridge } from '@/hooks/twin/useWarehouseBridge';
import { useWarehouseStore, type WarehouseView } from '@/stores/warehouseStore';
import { formatQty } from '@/utils/format';
import { BIN_LOOK_LABEL, binLook, LOOK_TONE, TODAY, type BinLook } from '@/utils/twin';

const VIEW_OPTIONS = [
  ['3d', '3D'],
  ['table', '표'],
] as const satisfies readonly (readonly [WarehouseView, string])[];

// 3D 씬(warehouse-3d.html)이 칸을 부르는 이름과 같아야 브릿지가 찾는다
const locKey = (p: TwinPlacement) => `${p.rack_id}-${p.level}-${p.slot}`;

// mocks/fixtures/factory.ts 의 formatLocation 과 같은 규칙 — 앱은 mocks 를 import 하지 않는다
const formatLocation = (rack: TwinRack | undefined, p: TwinPlacement) =>
  rack && rack.levels === 1 ? `${rack.label} ${p.slot}칸` : `${p.rack_id} ${p.level}단 ${p.slot}칸`;

// 정렬 — 기본은 칸 위치순(선반 → 단 → 칸)
const SORTS = {
  location: '칸 위치순',
  stockDesc: '재고 많은 순',
  stockAsc: '재고 적은 순',
  pOutDesc: '결품 확률 높은 순',
  name: '이름순',
} as const;
type SortKey = keyof typeof SORTS;

// 정렬 중인 열에 aria-sort 를 단다
const SORTED_COLUMN: Record<SortKey, { col: string; dir: 'ascending' | 'descending' }> = {
  location: { col: 'location', dir: 'ascending' },
  stockDesc: { col: 'stock', dir: 'descending' },
  stockAsc: { col: 'stock', dir: 'ascending' },
  pOutDesc: { col: 'pOut', dir: 'descending' },
  name: { col: 'name', dir: 'ascending' },
};

const compareLoc = (a: TwinPlacement | undefined, b: TwinPlacement | undefined) => {
  if (!a || !b) return a ? -1 : b ? 1 : 0;
  return a.rack_id.localeCompare(b.rack_id) || a.level - b.level || a.slot - b.slot;
};

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
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [lookFilter, setLookFilter] = useState<BinLook | ''>('');
  const [sort, setSort] = useState<SortKey>('location');

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

  const q = query.trim().toLowerCase();
  const rows = projection.data.bins
    .filter((b) => {
      const part = partOf.get(b.part_id);
      const text = `${part?.name ?? ''} ${part?.spec ?? ''} ${b.part_id}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (category && part?.category !== category) return false;
      if (lookFilter && binLook(b) !== lookFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === 'stockDesc') return b.qty[TODAY] - a.qty[TODAY];
      if (sort === 'stockAsc') return a.qty[TODAY] - b.qty[TODAY];
      if (sort === 'pOutDesc') return b.p_out[TODAY] - a.p_out[TODAY];
      if (sort === 'name') {
        const an = partOf.get(a.part_id)?.name ?? '';
        return an.localeCompare(partOf.get(b.part_id)?.name ?? '', 'ko');
      }
      return compareLoc(placementsOf.get(a.part_id)?.[0], placementsOf.get(b.part_id)?.[0]);
    });
  const sortedCol = SORTED_COLUMN[sort];
  const ariaSort = (col: string) => (sortedCol.col === col ? sortedCol.dir : undefined);

  const goTo = (loc: string) => {
    setSelectedLoc(loc);
    setView('3d');
    bridge.select(loc);
    bridge.flyTo({ locs: [loc] });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="search" className="relative">
          <label htmlFor="warehouse-table-search" className="sr-only">
            부품 검색
          </label>
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-text-secondary"
          />
          <input
            id="warehouse-table-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="부품 이름·규격"
            className={`${PILL_SEARCH} w-64 pl-12`}
          />
        </div>
        <label className="flex items-center gap-2 text-label-md text-text-body">
          분류
          <Select
            variant="pill"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | '')}
          >
            <option value="">전체</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 text-label-md text-text-body">
          상태
          <Select
            variant="pill"
            value={lookFilter}
            onChange={(e) => setLookFilter(e.target.value as BinLook | '')}
          >
            <option value="">전체</option>
            {(Object.entries(BIN_LOOK_LABEL) as [BinLook, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 text-label-md text-text-body">
          정렬
          <Select variant="pill" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {(Object.entries(SORTS) as [SortKey, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <p role="status" className="ml-auto text-label-md text-text-secondary">
          부품 {rows.length}개
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="조건에 맞는 부품이 없어요">검색어나 필터를 바꿔 보세요.</EmptyState>
      ) : (
        <div className={`${TABLE_CARD} overflow-x-auto`}>
          <table className={`${TABLE} tabular-nums`}>
            <caption className="sr-only">
              오늘 기준 칸별 재고. 칸 위치 버튼을 누르면 3D에서 그 칸으로 이동합니다.
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  aria-sort={ariaSort('location')}
                  className={`${TH} text-left whitespace-nowrap`}
                >
                  칸 위치
                </th>
                <th
                  scope="col"
                  aria-sort={ariaSort('name')}
                  className={`${TH} text-left whitespace-nowrap`}
                >
                  부품
                </th>
                <th
                  scope="col"
                  aria-sort={ariaSort('stock')}
                  className={`${TH} text-right whitespace-nowrap`}
                >
                  현재 재고
                </th>
                <th scope="col" className={`${TH} text-right whitespace-nowrap`}>
                  재주문점
                </th>
                <th scope="col" className={`${TH} text-left whitespace-nowrap`}>
                  상태
                </th>
                <th
                  scope="col"
                  aria-sort={ariaSort('pOut')}
                  className={`${TH} text-right whitespace-nowrap`}
                >
                  결품 확률
                </th>
                <th scope="col" className={`${TH} text-left whitespace-nowrap`}>
                  숨은 재고
                </th>
                <th scope="col" className={`${TH} text-left whitespace-nowrap`}>
                  확인 필요
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const part = partOf.get(b.part_id);
                const unit = part?.unit ?? '';
                const look = binLook(b);
                const placements = placementsOf.get(b.part_id) ?? [];
                return (
                  <tr key={b.part_id} className={TR}>
                    <td className={`${TD} whitespace-nowrap`}>
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
                    <td className={`${TD} whitespace-nowrap text-text-body`}>
                      {part?.name ?? b.part_id}
                    </td>
                    <td className={`${TD} text-right whitespace-nowrap text-text-heading`}>
                      {formatQty(Math.round(b.qty[TODAY] * 10) / 10, unit)}
                    </td>
                    <td className={`${TD} text-right whitespace-nowrap text-text-body`}>
                      {b.reorder_point === null ? '—' : formatQty(b.reorder_point, unit)}
                    </td>
                    <td className={TD}>
                      <DotTag as="span" tone={LOOK_TONE[look]}>
                        {BIN_LOOK_LABEL[look]}
                      </DotTag>
                    </td>
                    <td className={`${TD} text-right whitespace-nowrap text-text-body`}>
                      {Math.round(b.p_out[TODAY] * 100)}%
                    </td>
                    <td className={`${TD} whitespace-nowrap text-text-body`}>
                      {isHidden(b) ? '있음' : '—'}
                    </td>
                    <td className={`${TD} text-text-body`}>{b.audit ? b.audit.reason : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WarehouseTable;
