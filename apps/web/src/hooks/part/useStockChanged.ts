import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import { MOVEMENT_TYPES } from '@bjk/api/domain/part';
import { queryKeys } from '@bjk/api/queryKeys';
import type { StockChangedEvent } from '@bjk/api/types/events';
import type { Part } from '@bjk/api/types/part';

import { moveWarehouseStock } from '@/hooks/twin/useWarehouseBridge';
import { useToastStore } from '@/stores/toastStore';
import { formatQty } from '@/utils/format';

// 재고가 바뀐 순간의 알림 — 토스트 + 3D 창고 지게차 입출고 동작.
// 두 입구가 있다.
// - notify: 이 브라우저에서 채팅 확인 카드를 확정했을 때. 카드에 부품·수량·종류가 있어 그대로 쓴다.
// - onEvent: SSE stock.changed (NOT-03, 아직 연결 전). 이벤트에는 바뀐 뒤 재고만 있어 캐시의 이전 재고와 비교한다.
//   SSE 처리기는 parts·twin 쿼리를 무효화하기 **전에** 불러야 한다(무효화 뒤엔 이전 값이 없다).

// 내가 방금 기록한 것도 SSE 로 다시 온다. 그때 두 번 알리지 않도록 잠깐 기억해 둔다
const ECHO_MS = 15_000;
const recentLocal = new Map<string, number>();

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

export const useStockChanged = () => {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);

  const show = ({ partId, name, unit, delta, stock, adjust }: StockChangeNotice) => {
    if (delta === 0) return;
    const sign = delta > 0 ? '+' : '−';
    push({
      tone: delta > 0 ? 'in' : 'out',
      title: adjust
        ? `${name} ${MOVEMENT_TYPES.ADJUST} ${sign}${formatQty(Math.abs(delta), unit)}`
        : `${name} ${formatQty(Math.abs(delta), unit)} ${MOVEMENT_TYPES[delta > 0 ? 'IN' : 'OUT']}`,
      detail: stock === null ? null : `지금 재고 ${formatQty(stock, unit)}`,
    });
    // 3D 창고가 떠 있으면 바로, 아니면 다음에 열 때 지게차가 그 칸에 화물을 넣고(입고) 뺀다(출고)
    moveWarehouseStock({ partId, kind: delta > 0 ? 'in' : 'out' });
  };

  return {
    // 기록하기 직전에 불러 둔다. 확정 뒤에는 캐시가 새 값으로 바뀌어 있다
    cachedStock: (partId: string) => findCachedPart(queryClient, partId)?.stock ?? null,

    notify: (notice: StockChangeNotice) => {
      recentLocal.set(notice.partId, Date.now());
      show(notice);
    },

    onEvent: (event: StockChangedEvent) => {
      const mine = recentLocal.get(event.part_id);
      if (mine && Date.now() - mine < ECHO_MS) return;
      // 이 부품을 캐시에 받아 둔 적이 없으면(폰 채팅 화면 등) 이름을 몰라 알리지 않는다
      const part = findCachedPart(queryClient, event.part_id);
      if (!part) return;
      show({
        partId: event.part_id,
        name: part.name,
        unit: part.unit,
        delta: event.stock - part.stock,
        stock: event.stock,
      });
    },
  };
};
