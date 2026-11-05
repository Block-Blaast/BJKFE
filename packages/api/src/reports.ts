import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { PurchaseOrder, PurchaseOrderStatus, SimReport } from './types/report';

// ---- 백엔드 발주 형식 (BJK-AI-BE docs/api-spec/purchase-orders.md) ----
// 화면은 PurchaseOrder 형식을 쓰고, 여기서 백엔드 응답을 그 형식으로 바꾼다.
type BackendOrder = {
  id: string;
  review_id: string | null;
  part: { id: string; name: string };
  supplier: { id: string; name: string };
  qty: number;
  unit_price: number;
  total: number;
  status: PurchaseOrderStatus;
  approved_at: string;
  approved_by: string | null;
  ordered_at: string | null;
  received_qty: number;
};

type Page<T> = { items: T[]; next_cursor: string | null };

// 발주 상태 라벨 — 검토 상태(REVIEW_STATUSES)와 같은 말을 쓴다
export const PURCHASE_ORDER_STATUS: Record<PurchaseOrderStatus, string> = {
  approved: '주문 전',
  ordered: '발주됨',
  partially_received: '부분입고',
  received: '입고완료',
  cancelled: '취소',
};

const fromOrder = (o: BackendOrder): PurchaseOrder => ({
  id: o.id,
  review_id: o.review_id,
  part: o.part,
  qty: o.qty,
  supplier: o.supplier.name,
  unit_price: o.unit_price,
  total: o.total,
  status: o.status,
  approved_by: o.approved_by,
  approved_at: o.approved_at,
  ordered_at: o.ordered_at,
  received_qty: o.received_qty,
});

// 커서 목록은 100개씩 끝까지 받는다 (common.md: limit 최대 100)
export const getPurchaseOrders = async () => {
  const orders: PurchaseOrder[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: '100' });
    if (cursor) query.set('cursor', cursor);
    const page: Page<BackendOrder> = await request<Page<BackendOrder>>(
      `${ENDPOINTS.purchaseOrders}?${query}`,
    );
    orders.push(...page.items.map(fromOrder));
    cursor = page.next_cursor;
  } while (cursor);
  return orders;
};

// 공급사 문자 문구(F-APPROVAL-03)는 상세(PO-02)에만 있다. 희망 납기가 없으면 날짜 문장이 빠진다
export const getPurchaseOrderMessage = async (id: string) =>
  (await request<{ order_message: string }>(ENDPOINTS.purchaseOrder(id))).order_message;

// 전화·문자로 주문했다고 표시한다 (PO-03). 실제 납기는 이 시각부터 잰다. 시각을 비우면 지금
export const markPurchaseOrderOrdered = (id: string) =>
  request<{ id: string; status: PurchaseOrderStatus; ordered_at: string }>(
    ENDPOINTS.purchaseOrderMarkOrdered(id),
    { method: 'POST', body: JSON.stringify({}) },
  );

// approved 에서만 취소된다 (PO-04). 그 밖의 상태는 409 ORDER_STATE_CONFLICT
export const cancelPurchaseOrder = (id: string) =>
  request<{ id: string; status: PurchaseOrderStatus }>(ENDPOINTS.purchaseOrderCancel(id), {
    method: 'POST',
    body: JSON.stringify({}),
  });

// 검증 리포트 (명세 밖, 백엔드 PR #274) — 최신 순 커서 목록
export const getSimReports = async () => {
  const reports: SimReport[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: '100' });
    if (cursor) query.set('cursor', cursor);
    const page: Page<SimReport> = await request<Page<SimReport>>(
      `${ENDPOINTS.simReports}?${query}`,
    );
    reports.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return reports;
};

export const reportQueries = {
  purchaseOrders: () =>
    queryOptions({ queryKey: queryKeys.reports.purchaseOrders(), queryFn: getPurchaseOrders }),
  sim: () =>
    queryOptions({ queryKey: queryKeys.reports.sim(), queryFn: getSimReports, retry: false }),
};
