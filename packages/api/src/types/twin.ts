// 디지털 트윈(3D 창고, W-11) — [추가] 임시 계약. 명세서에 없는 화면이라 형식 전체가 프론트 제안이다.
// 원칙: 3D 는 계산하지 않고 그리기만 한다. 색·숫자는 모두 아래 응답에서 온다.
// - GET /twin/layout: 공간(선반·설비·도크·바닥 구역)과 부품이 놓인 칸
// - GET /twin/projection?with_orders=: 서버 경로 시뮬레이션(F-ANAL-07) 중앙값의 날짜별 재고·상태 + 겹쳐 그릴 정보

export type TwinRack = {
  id: string; // 'A-01'
  label: string; // 'A-01'
  levels: number;
  slots: number;
  x: number;
  z: number;
  rotation: number; // 라디안(y축)
  purpose: string; // '베어링'
};

export type TwinEquipmentKind = 'lathe' | 'mill' | 'press' | 'compressor' | 'conveyor';

export type TwinEquipment = {
  id: string;
  name: string;
  kind: TwinEquipmentKind;
  x: number;
  z: number;
  part_ids: string[]; // 이 설비가 쓰는 부품 (설비-부품 연결선)
};

export type TwinPlacement = {
  part_id: string;
  rack_id: string;
  level: number; // 1부터, 아래에서 위로
  slot: number; // 1부터, 왼쪽에서 오른쪽으로
};

export type TwinZone = {
  id: string;
  kind: 'storage' | 'machines' | 'dock';
  label: string;
  x: number; // 중심
  z: number;
  width: number;
  depth: number;
};

export type TwinLayout = {
  size: { width: number; depth: number }; // 바닥 크기(m)
  zones: TwinZone[]; // 바닥 안전선·입고 도크
  racks: TwinRack[];
  equipment: TwinEquipment[];
  placements: TwinPlacement[];
};

// ---- 예측 (GET /twin/projection) ----

// 판정 기준은 기존과 같다: 비어 있음 > 결품 확률 30% 이상 > 재주문점 이하 > 정상
export type TwinBinStatus = 'normal' | 'low' | 'risk' | 'out';
export type TwinEquipmentStatus = 'normal' | 'warn' | 'down';

export type TwinBin = {
  part_id: string;
  reorder_point: number | null;
  qty: number[]; // 0일(기준일 현재)부터 horizon_days 까지 날짜별 재고 (중앙값 경로)
  status: TwinBinStatus[];
  p_out: number[]; // 그날부터 다음 입고 가능일까지 결품 확률
  // 같은 규격·다른 이름 묶음 (F-MATCH-03). 같은 값끼리 숨은 재고다
  same_spec_group: string | null;
  // 열린 장부 의심 항목 (F-AUDIT)
  audit: { id: string; reason: string; grade: string } | null;
  maintenance: { date: string; qty: number; equipment: string }[]; // 확정 필요량 F
};

export type TwinEquipmentProjection = {
  equipment_id: string;
  status: TwinEquipmentStatus[];
  loss: (number | null)[]; // 멈추는 날의 예상 손실 L (손실액 미등록 설비는 null)
  cause_part_ids: string[][]; // 그날 멈추게(위험하게) 만드는 부품
};

// 도크에 놓일 입고 상자 — 발주됨(입고 예정 O) / 주문 대기(발주하면: 결정 대기 검토의 수정안)
export type TwinArrival = {
  part_id: string;
  qty: number;
  eta: string;
  kind: 'ordered' | 'proposal';
  review_id: string | null;
};

export type TwinProjection = {
  base_date: string;
  horizon_days: number;
  with_orders: boolean;
  computed_at: string;
  is_mock: boolean;
  bins: TwinBin[];
  equipment: TwinEquipmentProjection[];
  arrivals: TwinArrival[];
};
