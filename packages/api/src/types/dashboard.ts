// 대시보드 요약 (W-01 · BJK-AI-BE docs/api-spec/dashboard.md DSH-02). 새벽 배치 값과 원장 합산만으로 계산한다.

export type RiskItem = {
  part_id: string;
  name: string;
  p_out: number; // 결품 확률 0~1
  loss: number; // 결품 시 예상 손실(원) — 서버 필드명은 L
  priority: number; // P_out × L (F-ANAL-08)
  t_out: string | null; // 소진 예상일
};

export type DashboardSummary = {
  // 우선순위 상위 5개
  risk_top5: RiskItem[];
  pending_reviews: { count: number; urgent: number };
  // 닫히지 않은 의심 항목(열림·실사 요청됨)과 그중 높음
  audit_flags: { open: number; high: number };
  // 승인 후 주문 완료 표시를 기다리는 발주
  awaiting_order: number;
  // 최근 180일 출고가 없고 재고가 있는 부품의 재고 × 단가 합. 단가가 없는 부품은 0원으로 센다
  tied_up_stock_amount: number;
  external: { level: 'normal' | 'caution' | 'high'; updated_at: string | null };
  // Asia/Seoul 오늘 0시부터의 원장 기록·생성된 검토·결정 수
  today: { movements: number; reviews_created: number; decisions: number };
  computed_at: string | null; // 최신 근거 지표 계산 시각
};
