import { queryOptions } from '@tanstack/react-query';

import { itemsOf, request, USES_BACKEND } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { PurchaseOrder, SimReport } from './types/report';

// ---- 백엔드 발주 형식 (PO-01·02) ----
// 화면은 지금 PurchaseOrder 형식을 그대로 쓰고, 여기서 백엔드 응답을 그 형식으로 바꾼다. 목업은 PurchaseOrder 를 그대로 준다.
type BackendOrder = {
  id: string;
  review_id: string | null;
  part: { id: string; name: string };
  supplier: { id: string; name: string } | null;
  qty: number;
  unit_price: number | null;
  total: number | null;
  approved_at: string;
  approved_by: string | null;
};

// 백엔드는 부품 규격·단위와 희망 납기를 목록에 주지 않는다. 희망 납기는 PO-02 공급사 문자 문구 안에만 있다
const fromOrder = (o: BackendOrder): PurchaseOrder => ({
  id: o.id,
  review_id: o.review_id,
  part: { ...o.part, spec: null, unit: '개' },
  qty: o.qty,
  supplier: o.supplier?.name ?? null,
  unit_price: o.unit_price,
  total: o.total,
  desired_date: null,
  action: null,
  approved_by: o.approved_by ?? '',
  approved_at: o.approved_at,
  pdf_url: null,
});

const isBackendOrder = (o: PurchaseOrder | BackendOrder): o is BackendOrder =>
  'supplier' in o && typeof o.supplier === 'object' && o.supplier !== null;

export const getPurchaseOrders = async () => {
  const raw = await request<PurchaseOrder[] | { items: BackendOrder[] }>(
    USES_BACKEND ? `${ENDPOINTS.purchaseOrders}?limit=100` : ENDPOINTS.purchaseOrders,
  );
  return itemsOf<PurchaseOrder | BackendOrder>(raw).map((o) =>
    isBackendOrder(o) ? fromOrder(o) : o,
  );
};

// 공급사 문자 문구 (PO-02, F-APPROVAL-03). 백엔드가 희망 납기까지 넣어 만든다. 목업에는 없어 null — 화면이 직접 만든다
export const getPurchaseOrderMessage = async (id: string): Promise<string | null> => {
  if (!USES_BACKEND) return null;
  const detail = await request<{ order_message: string }>(ENDPOINTS.purchaseOrder(id));
  return detail.order_message;
};

// 백엔드는 공통 커서 목록({ items }), 목업은 배열을 준다
export const getSimReports = async () =>
  itemsOf(
    await request<SimReport[] | { items: SimReport[] }>(
      USES_BACKEND ? `${ENDPOINTS.simReports}?limit=100` : ENDPOINTS.simReports,
    ),
  );

export const reportQueries = {
  purchaseOrders: () =>
    queryOptions({ queryKey: queryKeys.reports.purchaseOrders(), queryFn: getPurchaseOrders }),
  sim: () => queryOptions({ queryKey: queryKeys.reports.sim(), queryFn: getSimReports }),
};
