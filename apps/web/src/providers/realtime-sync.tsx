'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { USES_BACKEND } from '@bjk/api/client';
import { listenServerEvents } from '@bjk/api/events';
import { queryKeys } from '@bjk/api/queryKeys';
import type { ServerEvent, StockChangedEvent } from '@bjk/api/types/events';

import { handleStockEvents } from '@/hooks/part/useStockChanged';

// 실시간 이벤트(NOT-03, SSE)를 탭마다 한 곳에서 받아 해당 쿼리를 무효화한다 (api.md: 화면마다 따로 구독하지 않는다).
// 재고 변화는 토스트·3D 지게차로도 알린다. 백엔드가 있는 빌드에서만 연결한다 — 목업(MSW)에는 SSE 가 없다.
//
// 재고 이벤트는 잠깐 모았다가 한 번에 처리한다. 엑셀 이관·병합은 부품마다 이벤트가 와서,
// 하나씩 무효화하면 같은 목록을 수십 번 다시 받는다.
const STOCK_BATCH_MS = 400;

const RealtimeSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!USES_BACKEND) return;
    const controller = new AbortController();
    let pending: StockChangedEvent[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    const invalidate = (...keys: (readonly unknown[])[]) =>
      keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));

    const flushStock = () => {
      timer = null;
      const batch = pending;
      pending = [];
      // 이전 재고를 캐시에서 읽어 입고·출고를 정하므로 무효화보다 먼저 알린다
      handleStockEvents(queryClient, batch);
      // 재고가 바뀌면 3D 예측·오늘 활동·브리핑 숫자와 장부 검증 항목도 바뀐다
      invalidate(
        queryKeys.parts.all,
        queryKeys.twin.all,
        queryKeys.activity.all,
        queryKeys.briefing.all,
        queryKeys.audits.all,
      );
    };

    const onEvent = (event: ServerEvent) => {
      switch (event.type) {
        case 'stock.changed':
          pending.push(event.data);
          timer ??= setTimeout(flushStock, STOCK_BATCH_MS);
          return;
        case 'review.created':
          // 결정 대기 검토의 수정안은 3D 창고의 "발주하면" 예측에 들어간다
          invalidate(queryKeys.reviews.all, queryKeys.briefing.all, queryKeys.twin.all);
          return;
        case 'review.progress':
          invalidate(queryKeys.reviews.detail(event.data.review_id));
          return;
        case 'review.decided':
          // 승인되면 발주 기록·PDF 가 생긴다 (reports)
          invalidate(
            queryKeys.reviews.all,
            queryKeys.briefing.all,
            queryKeys.twin.all,
            queryKeys.reports.all,
          );
          return;
        case 'audit.flagged':
          invalidate(queryKeys.audits.all, queryKeys.briefing.all, queryKeys.twin.all);
          return;
      }
    };

    void listenServerEvents(onEvent, controller.signal);
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [queryClient]);

  return null;
};

export default RealtimeSync;
