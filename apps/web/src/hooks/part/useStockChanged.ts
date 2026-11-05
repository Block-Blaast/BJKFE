import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { MOVEMENT_TYPES } from '@bjk/api/domain/part';
import { queryKeys } from '@bjk/api/queryKeys';
import type { StockChangedEvent } from '@bjk/api/types/events';
import type { Part } from '@bjk/api/types/part';

import { moveWarehouseStock } from '@/hooks/twin/useWarehouseBridge';
import { useToastStore } from '@/stores/toastStore';
import { formatQty } from '@/utils/format';

// 재고가 바뀐 순간의 알림 — 토스트 + 3D 창고 지게차 입출고 동작.
// 같은 기록이 세 길로 올 수 있다: 이 탭에서 확정(notify), 같은 브라우저의 다른 탭(BroadcastChannel),
// SSE stock.changed(handleStockEvents). 순서는 정해져 있지 않다. 그래서 두 가지로 한 번만 알린다.
// 1. 알리면 캐시의 그 부품 재고를 바뀐 값으로 바로 고쳐 둔다 → 늦게 온 SSE 는 캐시와 같아 차이가 0이다.
//    연속 이벤트도 무효화 재조회를 기다리지 않고 직전 값과 비교하게 된다.
// 2. 최근에 같은 부품·같은 결과로 알린 것은 건너뛴다 → SSE 가 먼저 오고 확정·다른 탭 알림이 늦게 와도 한 번이다.

const RECENT_MS = 15_000;
// 이보다 많은 부품이 한 번에 바뀌면 한 장으로 줄인다 (토스트는 최대 3장까지 쌓인다)
const BURST = 3;

export type StockChangeNotice = {
  partId: string;
  name: string;
  unit: string;
  delta: number; // 부호 있는 수량
  stock: number | null; // 바뀐 뒤 재고. 모르면 null
  adjust?: boolean; // 실사조정 — 늘어도 "입고"가 아니다
};

// parts.all 아래에는 목록·상세 말고 원장·예측도 있어, 부품 모양인 것만 고른다
const isPart = (value: unknown): value is Part =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'stock' in value &&
  'unit' in value;

// 캐시에 있는 부품 목록·상세에서 이 부품을 찾는다.
// 3D 창고·부품 목록은 useParts({}) 로 전체 목록을 받아 두므로 PC 화면에서는 거의 항상 찾는다.
const findCachedPart = (queryClient: QueryClient, partId: string) => {
  for (const [, data] of queryClient.getQueriesData({ queryKey: queryKeys.parts.all })) {
    const found = (Array.isArray(data) ? data : [data]).find(
      (p): p is Part => isPart(p) && p.id === partId,
    );
    if (found) return found;
  }
  return undefined;
};

const writeCachedStock = (queryClient: QueryClient, partId: string, stock: number) => {
  const patch = (p: unknown) => (isPart(p) && p.id === partId ? { ...p, stock } : p);
  queryClient.setQueriesData({ queryKey: queryKeys.parts.all }, (data: unknown) =>
    Array.isArray(data) ? data.map(patch) : patch(data),
  );
};

// 최근에 알린 기록. 결과 재고를 아는 기록은 "부품·결과·수량"으로, 모르는 기록(캐시가 없는 폰 화면에서 보냄)은
// "부품·수량"으로 알아본다. 같은 부품을 같은 수량으로 연달아 출고해도 결과 재고가 달라 둘 다 알린다.
const recent = new Map<string, number>();
const deltaKey = (n: StockChangeNotice) => `${n.partId}|Δ${n.delta}`;
const fullKey = (n: StockChangeNotice) => `${n.partId}|=${n.stock}|Δ${n.delta}`;
const pruneRecent = () => {
  const now = Date.now();
  for (const [key, at] of recent) if (now - at >= RECENT_MS) recent.delete(key);
};

// 알리고(토스트·지게차) 캐시를 바뀐 값으로 고친다. 이미 알린 것이면 false
const showStockChange = (queryClient: QueryClient, input: StockChangeNotice) => {
  if (input.delta === 0) return false;
  pruneRecent();
  if (recent.has(input.stock === null ? deltaKey(input) : fullKey(input))) return false;
  // 결과 재고를 모르면 이 탭 캐시에서 채운다 — 다음에 오는 SSE(결과 재고만 있음)와 맞춰 보기 위해서다
  const cached = input.stock === null ? findCachedPart(queryClient, input.partId) : undefined;
  const notice = cached ? { ...input, stock: cached.stock + input.delta } : input;
  const now = Date.now();
  recent.set(deltaKey(notice), now);
  if (notice.stock !== null) {
    recent.set(fullKey(notice), now);
    writeCachedStock(queryClient, notice.partId, notice.stock);
  }

  const { partId, name, unit, delta, stock, adjust } = notice;
  const sign = delta > 0 ? '+' : '−';
  useToastStore.getState().push({
    tone: delta > 0 ? 'in' : 'out',
    title: adjust
      ? `${name} ${MOVEMENT_TYPES.ADJUST} ${sign}${formatQty(Math.abs(delta), unit)}`
      : `${name} ${formatQty(Math.abs(delta), unit)} ${MOVEMENT_TYPES[delta > 0 ? 'IN' : 'OUT']}`,
    detail: stock === null ? null : `지금 재고 ${formatQty(stock, unit)}`,
  });
  // 3D 창고가 떠 있으면 바로, 아니면 다음에 열 때 지게차가 그 칸에 화물을 넣고(입고) 뺀다(출고)
  moveWarehouseStock({ partId, kind: delta > 0 ? 'in' : 'out' });
  return true;
};

// 같은 브라우저의 다른 탭(예: 폰 화면 탭에서 기록, 3D 창고 탭은 열어 둠)은 자바스크립트가 따로 돌아
// 이 탭의 토스트·지게차를 모른다. 같은 출처 탭끼리 BroadcastChannel 로 알린다. 없는 브라우저면 이 탭만 알린다.
// 보내기·받기를 **한 객체**로 한다 — BroadcastChannel 은 보낸 객체에만 되돌려 주지 않아서,
// 객체를 둘 만들면 이 탭이 보낸 것을 이 탭이 또 받는다.
let channel: BroadcastChannel | null | undefined;
const getChannel = () => {
  if (channel !== undefined) return channel;
  try {
    channel =
      typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('bjk-stock-change');
  } catch {
    channel = null;
  }
  return channel;
};

// 루트 레이아웃(StockChangeSync)에서 한 번만 쓴다 — 다른 탭에서 온 기록을 이 탭에도 보여준다
export const useStockChangeSync = () => {
  const queryClient = useQueryClient();
  useEffect(() => {
    const ch = getChannel();
    if (!ch) return;
    const onMessage = (event: MessageEvent<StockChangeNotice>) =>
      void showStockChange(queryClient, event.data);
    ch.addEventListener('message', onMessage);
    return () => ch.removeEventListener('message', onMessage);
  }, [queryClient]);
};

// SSE stock.changed 묶음. 부르는 쪽(RealtimeSync)은 parts·twin 쿼리를 무효화하기 **전에** 불러야 한다
// (이전 재고를 캐시에서 읽는다). 엑셀 이관·병합처럼 한꺼번에 여러 부품이 바뀌면 토스트를 한 장으로 줄이고
// 지게차도 보내지 않는다 — 화면을 덮고 지게차가 줄줄이 밀리기 때문이다.
export const handleStockEvents = (queryClient: QueryClient, events: StockChangedEvent[]) => {
  // 같은 부품이 여러 번 오면 마지막 재고만 본다 (캐시의 이전 값과 한 번에 비교)
  const latest = new Map<string, StockChangedEvent>();
  for (const event of events) latest.set(event.part_id, event);
  const notices: StockChangeNotice[] = [];
  for (const event of latest.values()) {
    // 이 부품을 캐시에 받아 둔 적이 없으면(폰 채팅 화면 등) 이름을 몰라 알리지 않는다
    const part = findCachedPart(queryClient, event.part_id);
    if (!part || part.stock === event.stock) continue;
    notices.push({
      partId: event.part_id,
      name: part.name,
      unit: part.unit,
      delta: event.stock - part.stock,
      stock: event.stock,
    });
  }
  if (notices.length <= BURST) {
    notices.forEach((n) => showStockChange(queryClient, n));
    return;
  }
  for (const n of notices) writeCachedStock(queryClient, n.partId, n.stock ?? 0);
  useToastStore.getState().push({
    tone: 'info',
    title: `부품 ${notices.length}개의 재고가 바뀌었어요`,
    detail: '엑셀 이관·병합처럼 한꺼번에 바뀐 기록이에요',
  });
};

export const useStockChanged = () => {
  const queryClient = useQueryClient();

  return {
    // 확정하기 직전에 불러 둔다. 확정 뒤에는 캐시가 새 값으로 바뀌어 있다
    cachedStock: (partId: string) => findCachedPart(queryClient, partId)?.stock ?? null,

    // 확정에 성공하면 — 이 탭과 같은 브라우저의 다른 탭에 알린다
    notify: (notice: StockChangeNotice) => {
      if (showStockChange(queryClient, notice)) getChannel()?.postMessage(notice);
    },
  };
};
