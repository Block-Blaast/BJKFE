import { create } from 'zustand';

import type { TwinLayerKey, TwinLayers } from '@/utils/twin';

// 3D 창고(W-11) 화면 조작 상태 — 선택·강조의 유일한 출처.
// 목록 필터가 아니라 화면 조작이라 URL 이 아니라 store 에 둔다(desk.md).
// iframe 은 이 값을 따라 그리기만 한다: iframe 클릭 → postMessage → 여기 → WarehouseView 가 다시 iframe 에 반영.
// 서버 데이터(layout·projection)는 TanStack Query 캐시에만 둔다.

export type WarehouseView = '3d' | 'table';

export const ALL_LAYERS: TwinLayers = {
  status: true,
  hidden: true,
  suspect: true,
  impact: true,
  dock: true,
};

type WarehouseState = {
  view: WarehouseView;
  selectedLoc: string | null; // `${rack_id}-${level}-${slot}`
  selectedEquipmentId: string | null;
  hoveredLoc: string | null;
  highlighted: string[];
  highlightLabel: string | null; // 강조를 만든 칩·검색 이름 (패널 머리에 쓴다)
  layers: TwinLayers;
  panelOpen: boolean;
  frameReady: boolean;

  setView: (view: WarehouseView) => void;
  setSelectedLoc: (loc: string | null) => void;
  selectEquipment: (id: string | null) => void;
  setHoveredLoc: (loc: string | null) => void;
  setHighlight: (locs: string[], label?: string | null) => void;
  setLayers: (layers: Partial<TwinLayers>) => void;
  toggleLayer: (key: TwinLayerKey) => void;
  setPanelOpen: (open: boolean) => void;
  setFrameReady: (ready: boolean) => void;
  clearFocus: () => void; // 선택·강조를 모두 지운다 (전체 보기)
};

export const useWarehouseStore = create<WarehouseState>()((set) => ({
  view: '3d',
  selectedLoc: null,
  selectedEquipmentId: null,
  hoveredLoc: null,
  highlighted: [],
  highlightLabel: null,
  layers: ALL_LAYERS,
  panelOpen: true,
  frameReady: false,

  setView: (view) => set({ view }),
  setSelectedLoc: (loc) =>
    set(
      loc
        ? { selectedLoc: loc, selectedEquipmentId: null, panelOpen: true }
        : { selectedLoc: null },
    ),
  selectEquipment: (id) =>
    set(
      id
        ? { selectedEquipmentId: id, selectedLoc: null, panelOpen: true }
        : { selectedEquipmentId: null },
    ),
  setHoveredLoc: (loc) => set({ hoveredLoc: loc }),
  setHighlight: (locs, label = null) =>
    set({ highlighted: locs, highlightLabel: locs.length ? label : null }),
  setLayers: (layers) => set((s) => ({ layers: { ...s.layers, ...layers } })),
  toggleLayer: (key) => set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setFrameReady: (frameReady) => set({ frameReady }),
  clearFocus: () =>
    set({ selectedLoc: null, selectedEquipmentId: null, highlighted: [], highlightLabel: null }),
}));
