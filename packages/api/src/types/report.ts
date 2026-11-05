// 리포트 (W-09) — 발주 기록. 백엔드 PO-01~04(BJK-AI-BE docs/api-spec/purchase-orders.md) 형식을 reports.ts 가 바꾼다.

// approved(승인, 주문 전) → ordered(전화·문자로 주문함) → partially_received → received. 취소는 approved 에서만
export type PurchaseOrderStatus =
  'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export type PurchaseOrder = {
  id: string;
  // 검토 없이 들어온 발주는 null — 결재용 PDF 는 검토 단위라 이때는 없다
  review_id: string | null;
  part: { id: string; name: string };
  qty: number;
  supplier: string;
  unit_price: number;
  total: number;
  status: PurchaseOrderStatus;
  approved_by: string | null;
  approved_at: string;
  ordered_at: string | null;
  received_qty: number;
};

// 검증 리포트 (F-SIM-03·04, 백엔드 PR #274). sample: 시연 시드, harness: 검증 하네스 실행 결과
export type SimReport = {
  id: string;
  title: string;
  source: 'sample' | 'harness';
  created_at: string;
  pdf_url: string | null;
};
