import { useQueryClient } from '@tanstack/react-query';

import { MOVEMENT_TYPES } from '@bjk/api/domain/part';
import { queryKeys } from '@bjk/api/queryKeys';
import type { StockChangedEvent } from '@bjk/api/types/events';
import type { Part } from '@bjk/api/types/part';

import { useToastStore } from '@/stores/toastStore';
import { formatQty } from '@/utils/format';

// parts.all 아래에는 목록·상세 말고 원장·예측도 있어, 부품 모양인 것만 고른다
const isPart = (value: unknown): value is Part =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'stock' in value &&
  'unit' in value;

// 캐시에 있는 부품 목록·상세에서 이 부품의 "바뀌기 전" 값을 찾는다.
// 3D 창고·부품 목록은 useParts({}) 로 전체 목록을 받아 두므로 PC 화면에서는 거의 항상 찾는다.
const findCachedPart = (entries: [readonly unknown[], unknown][], partId: string) => {
  for (const [, data] of entries) {
    const found = (Array.isArray(data) ? data : [data]).find(
      (p): p is Part => isPart(p) && p.id === partId,
    );
    if (found) return found;
  }
  return undefined;
};

// SSE stock.changed (NOT-03) 를 받아 "볼베어링 6205ZZ 3개 입고" 토스트를 띄운다.
// 이벤트에는 바뀐 뒤 재고만 있어 입고·출고와 수량은 캐시의 이전 재고와 비교해 정한다. 그래서
// - SSE 처리기는 parts·twin 쿼리를 무효화하기 **전에** 이 함수를 불러야 한다(무효화 뒤엔 이전 값이 없다).
// - 채팅 실사 응답처럼 ADJUST 로 바뀐 재고도 늘면 입고, 줄면 출고로 보인다(이벤트에 기록 종류가 없다).
// - 이 부품이 캐시에 없으면(폰 채팅 화면 등) 이름을 모르므로 띄우지 않는다.
export const useStockChangedToast = () => {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);

  return (event: StockChangedEvent) => {
    const part = findCachedPart(
      queryClient.getQueriesData({ queryKey: queryKeys.parts.all }),
      event.part_id,
    );
    if (!part) return;
    const diff = event.stock - part.stock;
    if (diff === 0) return;
    const type = diff > 0 ? 'IN' : 'OUT';
    push({
      tone: diff > 0 ? 'in' : 'out',
      title: `${part.name} ${formatQty(Math.abs(diff), part.unit)} ${MOVEMENT_TYPES[type]}`,
      detail: `지금 재고 ${formatQty(event.stock, part.unit)}`,
    });
  };
};
