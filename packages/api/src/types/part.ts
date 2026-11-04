// 부품 — 임시 계약. 명세서 W-04·W-05 화면 요소와 F-REVIEW-02 기호를 따랐고 HTTP 형식은 명세서에 없다.
// 백엔드 OpenAPI 가 나오면 생성된 타입으로 교체하고, 이 파일을 지운다.
import type { AdjustReason } from '../domain/audit';
import type { AbcClass, Category, DemandPattern, MovementType, RiskLevel } from '../domain/part';

// 새벽 배치(03:00)가 계산한 근거 지표 (F-ANAL). 계산 전이거나 데이터가 없으면 null.
export type PartMetrics = {
  computed_at: string | null;
  abc: AbcClass | null;
  demand_pattern: DemandPattern | null;
  m: number | null; // 월 소모량
  D95: number | null;
  D99: number | null;
  reorder_point: number | null;
  R: number | null; // 권장 발주량
  LT50: number | null;
  LT90: number | null;
  t_out: string | null; // 소진 예상일
  t_deadline: string | null; // 발주 마감일
  p_out: number | null; // 다음 입고 가능일까지 결품 확률 (F-ANAL-07)
  loss: number | null; // 결품 시 예상 손실 L (F-ANAL-08)
  // 사용 기록 대신 월 사용 추정치로 계산했는지 — 화면에 "추정치 기반"으로 표시 (F-SETUP-04)
  estimated: boolean;
};

export type Part = {
  id: string;
  name: string;
  spec: string | null;
  category: Category | null;
  unit: string;
  stock: number; // S — 병합 부품 포함 (F-LEDGER-02)
  incoming: { qty: number; eta: string } | null; // O
  hidden_stock: number; // H — 같은 규격·다른 이름 부품의 재고 (F-MATCH-03)
  risk: RiskLevel | null; // 카테고리 외부 요인 위험도
  location: string | null;
  supplier: { name: string; unit_price: number | null } | null;
  aliases: string[];
  metrics: PartMetrics;
};

export type PartListFilters = {
  q?: string;
  category?: Category;
  abc?: AbcClass;
  pattern?: DemandPattern;
  risk?: RiskLevel;
};

// 원장 기록 (F-LEDGER-01). 추가만 가능하고, 잘못된 기록은 반대 방향 ADJUST 로 정정한다.
export type StockMovement = {
  id: string;
  type: MovementType;
  qty: number; // 부호 있는 수량
  message: string | null; // 원본 채팅 메시지
  reason: AdjustReason | string | null;
  created_at: string;
};
