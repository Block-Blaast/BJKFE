// 개발·시연용 가상 공장 (v2 목업). 명세서에 없는 값이다 — 시연 이야기를 위해 정했다.
// 직원 12명 안팎의 금속가공 공장: CNC 선반 2대, 머시닝센터, 유압 프레스, 컴프레서, 컨베이어.
// 회사·공급사·직원 이름은 모두 가상이다.

// 지표 계산·사용 이력의 기준일 (명세서 예시 날짜와 맞춘다: 새벽 배치 2026-11-05 03:00)
export const BASE_DATE = '2026-11-05';
export const COMPUTED_AT = `${BASE_DATE}T03:00:00+09:00`;
export const HISTORY_DAYS = 90;

// ---- 창고 선반 (보관 위치 "B-01 2단 3칸") ----
// 3D 창고(디지털 트윈)가 이 좌표로 선반을 세운다. 단위 m, 바닥 기준. rotation 은 라디안(y축).
// 구역 A·B·C 에 선반 8개 — 3D 예시 창고와 같은 배치다.
export type Rack = {
  id: string; // 'A-01'
  label: string; // 'A-01'
  levels: number;
  slots: number;
  x: number;
  z: number;
  rotation: number;
  purpose: string;
};

const rack = (id: string, levels: number, x: number, z: number, purpose: string): Rack => ({
  id,
  label: id,
  levels,
  slots: 4,
  x,
  z,
  rotation: 0,
  purpose,
});

export const RACKS: Rack[] = [
  rack('A-01', 4, -7, -2, '벨트·공압'),
  rack('A-02', 4, -7, 2, '유류·윤활'),
  rack('B-01', 4, -1.6, -2, '베어링'),
  rack('B-02', 4, -1.6, 2, '볼트·너트'),
  rack('B-03', 4, 2.2, -2, '씰·오링'),
  rack('B-04', 4, 2.2, 2, '절삭공구'),
  rack('C-01', 3, 7, -2, '필터'),
  rack('C-02', 3, 7, 2, '예비'),
];

// 바닥 구역 — 3D 바닥의 구역선과 구역 이름. 단위 m, 중심 좌표 + 크기.
export const FLOOR = { width: 22, depth: 18 } as const;
export const ZONES = [
  { id: 'zone-a', kind: 'storage', label: 'A  소모품', x: -7, z: 0, width: 4.4, depth: 8 },
  { id: 'zone-b', kind: 'storage', label: 'B  부품', x: 0.3, z: 0, width: 7.6, depth: 8 },
  { id: 'zone-c', kind: 'storage', label: 'C  필터·예비', x: 7, z: 0, width: 4.4, depth: 8 },
] as const;

export const formatLocation = (rackId: string, level: number, slot: number) => {
  const r = RACKS.find((x) => x.id === rackId);
  return r && r.levels === 1 ? `${r.label} ${slot}칸` : `${rackId} ${level}단 ${slot}칸`;
};

// ---- 설비 (F-SETUP-04) ----
// hourly_loss 가 null 인 설비는 손실 금액 대신 "멈추는 설비"만 보여준다 (명세서 규칙 그대로).
export type MockEquipment = {
  id: string;
  name: string;
  kind: 'lathe' | 'mill' | 'press' | 'compressor' | 'conveyor';
  parts: { part_id: string; qty: number }[];
  hourly_loss: number | null;
  daily_hours: number | null;
  // 3D 배치 (m)
  x: number;
  z: number;
};

export const EQUIPMENT_FIXTURES: MockEquipment[] = [
  {
    id: 'eq-cnc-1',
    name: 'CNC 선반 1호기',
    kind: 'lathe',
    parts: [
      { part_id: 'pt-bearing-6205zz', qty: 2 },
      { part_id: 'pt-vbelt-a42', qty: 2 },
      { part_id: 'pt-insert-cnmg', qty: 4 },
      { part_id: 'pt-coolant-20l', qty: 1 },
    ],
    hourly_loss: 80000,
    daily_hours: 8,
    x: 6.6,
    z: -4,
  },
  {
    id: 'eq-cnc-2',
    name: 'CNC 선반 2호기',
    kind: 'lathe',
    parts: [
      { part_id: 'pt-bearing-6206zz', qty: 2 },
      { part_id: 'pt-vbelt-b50', qty: 2 },
      { part_id: 'pt-insert-cnmg', qty: 4 },
      { part_id: 'pt-oilseal-tc30', qty: 2 },
    ],
    hourly_loss: 80000,
    daily_hours: 8,
    x: 6.6,
    z: 0,
  },
  {
    id: 'eq-mct-1',
    name: '머시닝센터 MCT-1',
    kind: 'mill',
    parts: [
      { part_id: 'pt-endmill-10', qty: 1 },
      { part_id: 'pt-timing-htd', qty: 1 },
      { part_id: 'pt-bearing-6305zz', qty: 2 },
      { part_id: 'pt-slideway-68', qty: 1 },
    ],
    hourly_loss: 120000,
    daily_hours: 10,
    x: 6.6,
    z: 4,
  },
  {
    id: 'eq-press-1',
    name: '유압 프레스 P-80',
    kind: 'press',
    parts: [
      { part_id: 'pt-hyd-packing', qty: 1 },
      { part_id: 'pt-hydoil-vg46', qty: 2 },
      { part_id: 'pt-filter-return', qty: 1 },
      { part_id: 'pt-oring-p20', qty: 4 },
    ],
    hourly_loss: 60000,
    daily_hours: 8,
    x: 2.6,
    z: -1,
  },
  {
    id: 'eq-comp-1',
    name: '공기압축기 22kW',
    kind: 'compressor',
    parts: [
      { part_id: 'pt-filter-intake', qty: 1 },
      { part_id: 'pt-filter-oil', qty: 1 },
      { part_id: 'pt-frl-unit', qty: 1 },
    ],
    // 손실액을 등록하지 않은 설비 — 화면이 금액 대신 설비 이름만 보여주는지 확인용
    hourly_loss: null,
    daily_hours: null,
    x: 2.6,
    z: -6,
  },
  {
    id: 'eq-conveyor-1',
    name: '이송 컨베이어 1라인',
    kind: 'conveyor',
    parts: [
      { part_id: 'pt-pillow-ucp205', qty: 4 },
      { part_id: 'pt-bearing-6204', qty: 2 },
      { part_id: 'pt-solenoid-5p', qty: 1 },
    ],
    hourly_loss: 40000,
    daily_hours: 8,
    x: 3,
    z: 5,
  },
];

// 정비 일정 — 6205ZZ: F-REVIEW-10 예시 "11월 20일 정비에 4개 필요"
// completed 는 이미 끝난 정비 — 예측에는 안 들어가고, 장부 검증(F-AUDIT-02 정비-출고 불일치) 이야기에 쓴다.
export type MockMaintenance = {
  id: string;
  equipment_id: string;
  scheduled_on: string;
  parts: { part_id: string; qty: number }[];
  completed?: boolean;
};

export const MAINTENANCE_FIXTURES: MockMaintenance[] = [
  {
    id: 'mt-cnc-1-1120',
    equipment_id: 'eq-cnc-1',
    scheduled_on: '2026-11-20',
    parts: [
      { part_id: 'pt-bearing-6205zz', qty: 4 },
      { part_id: 'pt-vbelt-a42', qty: 2 },
    ],
  },
  {
    id: 'mt-press-1-1126',
    equipment_id: 'eq-press-1',
    scheduled_on: '2026-11-26',
    parts: [
      { part_id: 'pt-hyd-packing', qty: 1 },
      { part_id: 'pt-filter-return', qty: 1 },
    ],
  },
  // 오일씰 2개를 교체했는데 출고 기록이 없다 → 장부 의심 au-oilseal-tc30
  {
    id: 'mt-cnc-2-1030',
    equipment_id: 'eq-cnc-2',
    scheduled_on: '2026-10-30',
    parts: [{ part_id: 'pt-oilseal-tc30', qty: 2 }],
    completed: true,
  },
];

// ---- 공급사 ----
// ○○베어링상사·A·B 는 명세서 예시(F-SETUP-01, F-REVIEW-10)의 자리 표시 이름이라, 시연용 가상 이름으로 바꿨다.
export type MockSupplier = {
  id: string;
  name: string;
  contact: string | null;
  default_lead_days: number | null;
  holidays: string[];
};

export const SUPPLIER_FIXTURES: MockSupplier[] = [
  {
    id: 'sp-bearing-shop',
    name: '○○베어링상사',
    contact: null,
    default_lead_days: 7,
    holidays: [],
  },
  {
    id: 'sp-a',
    name: '대명동력',
    contact: '031-000-0001',
    default_lead_days: 3,
    holidays: [],
  },
  {
    id: 'sp-b',
    name: '신흥베어링',
    contact: '031-000-0002',
    default_lead_days: 5,
    holidays: [],
  },
  { id: 'sp-bolt', name: '삼정볼트', contact: '031-000-0003', default_lead_days: 2, holidays: [] },
  {
    id: 'sp-pneu',
    name: '한울유공압',
    contact: '031-000-0004',
    default_lead_days: 5,
    holidays: [],
  },
  {
    id: 'sp-tool',
    name: '정우툴링',
    contact: '031-000-0005',
    default_lead_days: 3,
    holidays: [],
  },
  { id: 'sp-oil', name: '서해오일', contact: '031-000-0006', default_lead_days: 3, holidays: [] },
];

// ---- 결정적 난수 ----
// 시연 때마다 같은 이력이 나오도록 부품 ID 로 씨앗을 정한다 (mulberry32).
export const seededRandom = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
