import type { TwinLayout, TwinProjection } from '@bjk/api/types/twin';

import { useWarehouseStore } from '@/stores/warehouseStore';
import { TODAY, type TwinLayers } from '@/utils/twin';

// 3D 창고(W-11) 브릿지 — React 오버레이 ↔ public/warehouse-3d.html(iframe).
// 계약(반대편 warehouse-3d.html 과 같이 정했다. 바꾸면 양쪽을 함께 바꾼다):
//   iframe.contentWindow.warehouse = { setData, setDay, setLayers, select, highlight, flyTo }
//   iframe → 부모 postMessage: { source: 'warehouse-3d', type: 'ready' | 'select' | 'hover', ...payload }
// 칸 id(loc)는 `${rack_id}-${level}-${slot}` (TwinPlacement 와 1:1).
//
// 흐름은 한 방향이다: 명령(select·highlight·setLayers)은 store 만 바꾸고,
// iframe 반영은 registerWarehouseFrame 이 store 를 구독해서 한 곳에서 한다.
// 그래서 iframe 클릭도 store 를 거쳐 다시 select() 로 돌아간다 — 씬과 패널이 어긋나지 않는다.

export type WarehouseFlyTarget = 'home' | 'top' | { locs: string[] } | { equipmentId: string };

export type WarehouseDataPayload = {
  layout: TwinLayout;
  projection: TwinProjection;
  day: number;
};

type WarehouseApi = {
  setData: (payload: WarehouseDataPayload) => void;
  setDay: (day: number) => void;
  setLayers: (layers: TwinLayers) => void;
  select: (loc: string | null) => void;
  highlight: (locs: string[]) => void;
  flyTo: (target: WarehouseFlyTarget) => void;
};

type WarehouseMessage =
  | { source: 'warehouse-3d'; type: 'ready' }
  | { source: 'warehouse-3d'; type: 'select'; loc: string | null; partId?: string | null }
  | { source: 'warehouse-3d'; type: 'hover'; loc: string | null };

// 패널 섹션·표·칩이 모두 같은 iframe 을 써야 해서 모듈에 하나만 둔다
let frame: HTMLIFrameElement | null = null;
let lastData: WarehouseDataPayload | null = null;
// ready 전에 온 카메라 이동은 마지막 것만 의미가 있다. 상태(data·layers·선택·강조)는 ready 때 store 에서 다시 보낸다
let pendingFly: WarehouseFlyTarget | null = null;

const api = (): WarehouseApi | null => {
  if (!frame || !useWarehouseStore.getState().frameReady) return null;
  // 같은 출처라 contentWindow 의 전역에 바로 닿는다. 다시 로드하는 중이면 아직 없다
  const win = frame.contentWindow as (Window & { warehouse?: WarehouseApi }) | null;
  return win?.warehouse ?? null;
};

const replay = (w: WarehouseApi) => {
  const s = useWarehouseStore.getState();
  if (lastData) w.setData(lastData);
  w.setLayers(s.layers);
  w.highlight(s.highlighted);
  w.select(s.selectedLoc);
  if (pendingFly) {
    w.flyTo(pendingFly);
    pendingFly = null;
  }
};

const isWarehouseMessage = (data: unknown): data is WarehouseMessage =>
  typeof data === 'object' &&
  data !== null &&
  (data as { source?: unknown }).source === 'warehouse-3d' &&
  typeof (data as { type?: unknown }).type === 'string';

const onMessage = (event: MessageEvent) => {
  if (event.origin !== window.location.origin) return;
  if (!frame || event.source !== frame.contentWindow) return;
  if (!isWarehouseMessage(event.data)) return;
  const store = useWarehouseStore.getState();
  const msg = event.data;
  if (msg.type === 'ready') {
    // iframe 을 다시 로드해도 ready 가 다시 오므로 그때마다 전부 다시 보낸다
    store.setFrameReady(true);
    const w = api();
    if (w) replay(w);
  } else if (msg.type === 'select') {
    store.setSelectedLoc(msg.loc ?? null);
  } else if (msg.type === 'hover') {
    store.setHoveredLoc(msg.loc ?? null);
  }
};

// iframe 을 띄우는 쪽(WarehouseView)만 쓴다: <iframe ref={registerWarehouseFrame} />
// React 19 ref 정리 함수로 메시지 구독과 store 구독을 함께 푼다.
export const registerWarehouseFrame = (el: HTMLIFrameElement | null) => {
  if (!el) return;
  frame = el;
  window.addEventListener('message', onMessage);
  // iframe 은 서버 HTML 에 들어 있어 하이드레이션보다 먼저 다 뜰 수 있다 — 그러면 ready 메시지를 놓친다.
  // 이미 window.warehouse 가 있으면 ready 를 받은 것으로 본다
  const loaded = !!(el.contentWindow as (Window & { warehouse?: WarehouseApi }) | null)?.warehouse;
  useWarehouseStore.getState().setFrameReady(loaded);
  const unsubscribe = useWarehouseStore.subscribe((s, prev) => {
    const w = api();
    if (!w) return;
    if (s.frameReady !== prev.frameReady) return; // ready 직후는 replay 가 보냈다
    if (s.layers !== prev.layers) w.setLayers(s.layers);
    if (s.highlighted !== prev.highlighted) w.highlight(s.highlighted);
    if (s.selectedLoc !== prev.selectedLoc) w.select(s.selectedLoc);
  });
  if (loaded) {
    const w = api();
    if (w) replay(w);
  }
  return () => {
    unsubscribe();
    window.removeEventListener('message', onMessage);
    if (frame === el) frame = null;
    useWarehouseStore.getState().setFrameReady(false);
  };
};

// layout·projection 이 바뀔 때 WarehouseView 가 부른다
export const pushWarehouseData = (payload: Omit<WarehouseDataPayload, 'day'>) => {
  // 화면은 오늘 상태만 보여 준다 (날짜 시뮬레이션 없음)
  lastData = { ...payload, day: TODAY };
  api()?.setData(lastData);
};

const flyTo = (target: WarehouseFlyTarget) => {
  const w = api();
  if (w) w.flyTo(target);
  else pendingFly = target;
};

const commands = {
  select: (loc: string | null) => useWarehouseStore.getState().setSelectedLoc(loc),
  highlight: (locs: string[], label?: string) =>
    useWarehouseStore.getState().setHighlight(locs, label),
  setLayers: (layers: Partial<TwinLayers>) => useWarehouseStore.getState().setLayers(layers),
  flyTo,
  // 칩·검색 결과: 여러 칸을 강조하고 그쪽으로 날아가 패널을 연다
  focus: (locs: string[], label?: string) => {
    const s = useWarehouseStore.getState();
    s.setSelectedLoc(null);
    s.setHighlight(locs, label);
    s.setPanelOpen(true);
    if (locs.length) flyTo({ locs });
  },
  // 칸 하나로 날아가 선택
  goTo: (loc: string) => {
    useWarehouseStore.getState().setSelectedLoc(loc);
    flyTo({ locs: [loc] });
  },
  // 전체 보기 — 선택·강조도 지운다 (카메라만 돌리면 패널이 고른 칸을 계속 보여줘 화면과 말이 어긋난다)
  reset: () => {
    useWarehouseStore.getState().clearFocus();
    flyTo('home');
  },
};

export type WarehouseBridge = typeof commands & { ready: boolean };

// 어디서든: const bridge = useWarehouseBridge(); bridge.goTo('A-2-3');
export const useWarehouseBridge = (): WarehouseBridge => {
  const ready = useWarehouseStore((s) => s.frameReady);
  return { ...commands, ready };
};
