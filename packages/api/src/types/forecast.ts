// 재고 추이 + 예측선 (W-03, W-05) — 임시 계약. 명세서에는 "발주 시/미발주 시 예측선"이라는 요구만 있고 데이터 형식이 없다.
// 백엔드가 PDF 그래프(F-APPROVAL-04, matplotlib)에 쓰는 같은 데이터를 웹에도 주도록 맞춘다.

export type StockPoint = {
  date: string; // 'YYYY-MM-DD' (KST)
  qty: number;
};

export type StockForecast = {
  unit: string;
  today: string;
  computed_at: string | null;
  reorder_point: number | null;
  deadline: string | null; // 발주 마감일
  order_qty: number | null; // "발주 시" 선에 넣은 수량
  actual: StockPoint[]; // 원장 기준 실적 (일별 마감 재고)
  without_order: StockPoint[] | null; // 오늘부터 — 계산 근거가 없으면 null
  with_order: StockPoint[] | null; // 오늘부터 — 발주가 필요 없거나 납기를 모르면 null
  // 목업이 단순 계산으로 만든 값인지 (실제 예측은 서버의 시뮬레이션, F-ANAL-07)
  is_mock: boolean;
};
