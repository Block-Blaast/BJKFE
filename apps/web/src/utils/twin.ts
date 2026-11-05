// 3D 창고(W-11) 표시 규칙. 숫자는 계산하지 않는다 — /twin/projection 의 상태를 어떤 색·라벨로 그릴지만 정한다.
import type {
  TwinBin,
  TwinBinStatus,
  TwinEquipmentStatus,
  TwinPlacement,
  TwinProjection,
} from '@bjk/api/types/twin';

export type TwinLayerKey = 'status' | 'hidden' | 'suspect' | 'impact' | 'dock';
export type TwinLayers = Record<TwinLayerKey, boolean>;

export const TWIN_LAYERS: { key: TwinLayerKey; label: string }[] = [
  { key: 'status', label: '재고 상태' },
  { key: 'hidden', label: '숨은 재고' },
  { key: 'suspect', label: '장부 의심' },
  { key: 'impact', label: '설비 영향' },
  { key: 'dock', label: '입고 흐름' },
];

// 칸에 실제로 칠할 표시 — 층을 끄면 그 의미의 색을 빼고 정상으로 그린다
export type BinLook = TwinBinStatus | 'suspect';

export const BIN_LOOK_LABEL: Record<BinLook, string> = {
  normal: '정상',
  low: '재주문점 이하',
  risk: '결품 위험',
  out: '비어 있음',
  suspect: '장부 의심',
};

export const EQUIPMENT_STATUS_LABEL: Record<TwinEquipmentStatus, string> = {
  normal: '가동',
  warn: '위험 부품 있음',
  down: '정지 예상',
};

// projection 의 날짜별 배열에서 오늘 칸. 화면은 오늘 상태만 보여 준다(날짜 시뮬레이션은 쓰지 않는다)
export const TODAY = 0;

// 우선순위: 비어 있음·결품 위험 > 장부 의심 > 재주문점 이하 > 정상
export const binLook = (bin: TwinBin, layers: TwinLayers): BinLook => {
  const s = bin.status[TODAY];
  if (layers.status && (s === 'out' || s === 'risk')) return s;
  if (layers.suspect && bin.audit) return 'suspect';
  if (layers.status && s === 'low') return 'low';
  return 'normal';
};

export const LOOK_ORDER: Record<BinLook, number> = {
  out: 0,
  risk: 1,
  suspect: 2,
  low: 3,
  normal: 4,
};

// DotTag 톤 (점 색은 보조, 의미는 글씨)
export const LOOK_TONE: Record<BinLook, 'inverse' | 'warning' | 'danger' | 'neutral'> = {
  normal: 'neutral',
  low: 'warning',
  risk: 'danger',
  out: 'danger',
  suspect: 'inverse',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const dayOf = (base: string, ymd: string) =>
  Math.round((Date.parse(`${ymd}T00:00:00Z`) - Date.parse(`${base}T00:00:00Z`)) / DAY_MS);

export const shortDate = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;

// 검색어가 이름·규격에 들어간 부품의 같은 규격 묶음까지 함께 강조한다
export const normalizeSearch = (text: string) =>
  text.toLowerCase().replace(/×/g, 'x').replace(/\s/g, '');

// 칸 id — 3D 씬(warehouse-3d.html)이 칸을 부르는 이름과 같아야 브릿지가 찾는다
export const twinLoc = (p: Pick<TwinPlacement, 'rack_id' | 'level' | 'slot'>) =>
  `${p.rack_id}-${p.level}-${p.slot}`;

// 부품 하나가 여러 칸에 놓일 수 있어 칸 목록으로 돌려준다
export const locsByPart = (placements: TwinPlacement[]) => {
  const map = new Map<string, string[]>();
  for (const p of placements) map.set(p.part_id, [...(map.get(p.part_id) ?? []), twinLoc(p)]);
  return map;
};

export type TwinSummaryKey = 'pending' | 'risk' | 'suspect' | 'arriving';

export const TWIN_SUMMARY_LABEL: Record<TwinSummaryKey, string> = {
  pending: '결정 대기',
  risk: '결품 위험',
  suspect: '장부 의심',
  arriving: '도착 예정',
};

// 상단 요약 칩 — 세기만 한다. 결정 대기(수정안 상자)는 "발주하면" 예측에만 실리므로 그쪽에서 센다
export const twinSummary = (
  projection: TwinProjection,
  withOrdersProjection: TwinProjection | undefined,
): Record<TwinSummaryKey, string[]> => {
  const unique = (ids: string[]) => [...new Set(ids)];
  return {
    pending: unique(
      (withOrdersProjection?.arrivals ?? [])
        .filter((a) => a.kind === 'proposal')
        .map((a) => a.part_id),
    ),
    risk: projection.bins.filter((b) => b.status[TODAY] === 'risk').map((b) => b.part_id),
    suspect: projection.bins.filter((b) => b.audit).map((b) => b.part_id),
    arriving: unique(projection.arrivals.filter((a) => a.kind === 'ordered').map((a) => a.part_id)),
  };
};
