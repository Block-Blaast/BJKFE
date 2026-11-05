import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { CATEGORIES } from './domain/part';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type {
  TwinBin,
  TwinBinStatus,
  TwinLayout,
  TwinPlacement,
  TwinProjection,
  TwinRack,
  TwinZone,
} from './types/twin';

// 3D 창고(W-11) — 백엔드에 창고 배치 API 가 없어, 선반 배치(아래 상수)는 프론트가 정하고
// 칸에 놓이는 부품·재고·상태는 DB 부품 목록(GET /v1/parts)에서 만든다.
// TODO(W-11): 백엔드가 부품 보관 위치(location)를 목록에 주면 그 위치로 놓는다. 지금은 분류·이름 순으로 앞 칸부터 채운다.

// ---- 선반 배치 (단위 m, 바닥 기준) — 구역 A·B·C 에 선반 8개 ----
const rack = (id: string, levels: number, x: number, z: number, purpose: string): TwinRack => ({
  id,
  label: id,
  levels,
  slots: 4,
  x,
  z,
  rotation: 0,
  purpose,
});

const RACKS: TwinRack[] = [
  rack('A-01', 4, -7, -2, '소모품'),
  rack('A-02', 4, -7, 2, '소모품'),
  rack('B-01', 4, -1.6, -2, '부품'),
  rack('B-02', 4, -1.6, 2, '부품'),
  rack('B-03', 4, 2.2, -2, '부품'),
  rack('B-04', 4, 2.2, 2, '부품'),
  rack('C-01', 3, 7, -2, '필터·예비'),
  rack('C-02', 3, 7, 2, '필터·예비'),
];

const ZONES: TwinZone[] = [
  { id: 'zone-a', kind: 'storage', label: 'A  소모품', x: -7, z: 0, width: 4.4, depth: 8 },
  { id: 'zone-b', kind: 'storage', label: 'B  부품', x: 0.3, z: 0, width: 7.6, depth: 8 },
  { id: 'zone-c', kind: 'storage', label: 'C  필터·예비', x: 7, z: 0, width: 4.4, depth: 8 },
];

// ---- DB 부품 목록 (SET-03) ----
type PartRow = {
  id: string;
  name: string;
  category: string | null;
  stock: number;
  p_out: number | null;
  ledger_status: string;
  computed_at: string | null;
};

const fetchAllParts = async (): Promise<PartRow[]> => {
  const rows: PartRow[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: '100' });
    if (cursor) query.set('cursor', cursor);
    const page: { items: PartRow[]; next_cursor: string | null } = await request(
      `${ENDPOINTS.parts}?${query}`,
    );
    rows.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return rows;
};

// 분류 순서(카테고리 상수) → 이름 순으로 정렬해 선반 앞 칸부터 채운다
const categoryRank = (c: string | null) => {
  const i = CATEGORIES.indexOf(c as (typeof CATEGORIES)[number]);
  return i < 0 ? CATEGORIES.length : i;
};

const placementsOf = (parts: PartRow[]): TwinPlacement[] => {
  const slots = RACKS.flatMap((r) =>
    Array.from({ length: r.levels * r.slots }, (_, i) => ({
      rack_id: r.id,
      level: Math.floor(i / r.slots) + 1,
      slot: (i % r.slots) + 1,
    })),
  );
  return [...parts]
    .sort(
      (a, b) =>
        categoryRank(a.category) - categoryRank(b.category) || a.name.localeCompare(b.name, 'ko'),
    )
    .slice(0, slots.length)
    .map((p, i) => ({ part_id: p.id, ...slots[i] }));
};

// 판정 기준(기존과 같음): 비어 있음 > 결품 확률 30% 이상. 재주문점은 목록에 없어 "재주문점 이하"는 쓰지 않는다
const RISK_P_OUT = 0.3;
const statusOf = (p: PartRow): TwinBinStatus =>
  p.stock <= 0 ? 'out' : (p.p_out ?? 0) >= RISK_P_OUT ? 'risk' : 'normal';

const binOf = (p: PartRow): TwinBin => ({
  part_id: p.id,
  reorder_point: null,
  qty: [p.stock],
  status: [statusOf(p)],
  p_out: [p.p_out ?? 0],
  same_spec_group: null,
  // 장부 검증에서 의심이 걸린 부품(ledger_status ≠ normal)은 "확인 필요"로 보인다
  audit:
    p.ledger_status !== 'normal'
      ? { id: '', reason: '재고 기록을 확인해 주세요', grade: '중간' }
      : null,
  maintenance: [],
});

export const getTwinLayout = async (): Promise<TwinLayout> => ({
  size: { width: 22, depth: 18 },
  zones: ZONES,
  racks: RACKS,
  equipment: [],
  placements: placementsOf(await fetchAllParts()),
});

// 화면은 오늘 값(qty[0])만 쓴다. 발주 전·후 경로 계산은 백엔드에 없어 같은 값을 준다
export const getTwinProjection = async (withOrders: boolean): Promise<TwinProjection> => {
  const parts = await fetchAllParts();
  const computed = parts.map((p) => p.computed_at).find(Boolean) ?? new Date().toISOString();
  return {
    base_date: computed.slice(0, 10),
    horizon_days: 0,
    with_orders: withOrders,
    computed_at: computed,
    is_mock: false,
    bins: parts.map(binOf),
    equipment: [],
    arrivals: [],
  };
};

export const twinQueries = {
  layout: () =>
    queryOptions({
      queryKey: queryKeys.twin.layout(),
      queryFn: getTwinLayout,
    }),
  projection: (withOrders: boolean) =>
    queryOptions({
      queryKey: queryKeys.twin.projection(withOrders),
      queryFn: () => getTwinProjection(withOrders),
    }),
};
