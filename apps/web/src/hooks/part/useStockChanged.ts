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
// 두 입구가 있다.
// - begin → notify: 이 브라우저에서 채팅 확인 카드를 확정할 때. 카드에 부품·수량·종류가 있어 그대로 쓴다.
// - onEvent: SSE stock.changed (NOT-03, 아직 연결 전). 이벤트에는 바뀐 뒤 재고만 있어 캐시의 이전 재고와 비교한다.
//   SSE 처리기는 parts·twin 쿼리를 무효화하기 **전에** 불러야 한다(무효화 뒤엔 이전 값이 없다).

// 내가 기록한 것도 SSE 로 다시 온다. 응답보다 SSE 가 먼저 올 수도 있어, 요청을 보내기 **전에**(begin)
// "이 부품이 이 재고가 될 것"을 적어 두고, 맞는 이벤트 하나만 지운다. 값이 다르면 남이 바꾼 것이라 알린다.
const ECHO_MS = 15_000;
type Expected = { stock: number | null; at: number }; // stock 을 모르면(캐시에 없음) 그 부품의 첫 이벤트를 내 것으로 본다
const expected = new Map<string, Expected[]>();

const prune = (now: number) => {
  for (const [partId, list] of expected) {
    const live = list.filter((e) => now - e.at < ECHO_MS);
    if (live.length) expected.set(partId, live);
    else expected.delete(partId);
  }
};

// 내 기록의 메아리면 그 기대값을 지우고 true
const consumeEcho = (event: StockChangedEvent) => {
  const now = Date.now();
  prune(now);
  const list = expected.get(event.part_id);
  const i = list?.findIndex((e) => e.stock === null || e.stock === event.stock) ?? -1;
  if (!list || i < 0) return false;
  list.splice(i, 1);
  if (!list.length) expected.delete(event.part_id);
  return true;
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

export type StockChangeNotice = {
  partId: string;
  name: string;
  unit: string;
  delta: number; // 부호 있는 수량
  stock: number | null; // 바뀐 뒤 재고. 모르면 null
  adjust?: boolean; // 실사조정 — 늘어도 "입고"가 아니다
};

const expect = (notice: StockChangeNotice) => {
  const now = Date.now();
  prune(now);
  expected.set(notice.partId, [
    ...(expected.get(notice.partId) ?? []),
    { stock: notice.stock, at: now },
  ]);
};

const showStockChange = ({ partId, name, unit, delta, stock, adjust }: StockChangeNotice) => {
  if (delta === 0) return;
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
};

// 같은 브라우저의 다른 탭(예: 폰 화면 탭에서 기록, 3D 창고 탭은 열어 둠)은 자바스크립트가 따로 돌아
// 이 탭의 토스트·지게차를 모른다. 같은 출처 탭끼리 BroadcastChannel 로 알린다. 없는 브라우저면 이 탭만 알린다.
const CHANNEL = 'bjk-stock-change';
const openChannel = () => {
  try {
    return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);
  } catch {
    return null;
  }
};
const outbox = typeof window === 'undefined' ? null : openChannel();

// 루트 레이아웃(StockChangeSync)에서 한 번만 쓴다 — 다른 탭에서 온 기록을 이 탭에도 보여준다
export const useStockChangeSync = () => {
  useEffect(() => {
    const inbox = openChannel();
    if (!inbox) return;
    inbox.onmessage = (event: MessageEvent<StockChangeNotice>) => {
      // 그 탭의 기록도 SSE 로 이 탭에 다시 온다 — 메아리로 알아보게 적어 둔다
      expect(event.data);
      showStockChange(event.data);
    };
    return () => inbox.close();
  }, []);
};

export const useStockChanged = () => {
  const queryClient = useQueryClient();

  return {
    // 기록하기 직전에 불러 둔다. 확정 뒤에는 캐시가 새 값으로 바뀌어 있다
    cachedStock: (partId: string) => findCachedPart(queryClient, partId)?.stock ?? null,

    // 확정 요청을 보내기 직전에 — 이 기록의 SSE 메아리를 알아보게 적어 둔다
    begin: expect,

    // 요청이 실패하면 메아리가 오지 않으니 적어 둔 것을 지운다
    cancel: (notice: StockChangeNotice) => {
      const list = expected.get(notice.partId);
      const i = list?.findIndex((e) => e.stock === notice.stock) ?? -1;
      if (!list || i < 0) return;
      list.splice(i, 1);
      if (!list.length) expected.delete(notice.partId);
    },

    // 확정에 성공하면 — 이 탭과 같은 브라우저의 다른 탭에 알린다
    notify: (notice: StockChangeNotice) => {
      showStockChange(notice);
      outbox?.postMessage(notice);
    },

    onEvent: (event: StockChangedEvent) => {
      if (consumeEcho(event)) return;
      // 이 부품을 캐시에 받아 둔 적이 없으면(폰 채팅 화면 등) 이름을 몰라 알리지 않는다
      const part = findCachedPart(queryClient, event.part_id);
      if (!part) return;
      showStockChange({
        partId: event.part_id,
        name: part.name,
        unit: part.unit,
        delta: event.stock - part.stock,
        stock: event.stock,
      });
    },
  };
};
