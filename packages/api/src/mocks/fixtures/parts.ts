// 개발·시연용 목업 부품 (v2). 두 종류가 섞여 있다.
// 1) 명세서 예시 부품 — 명세서 숫자(spec)는 그대로 두고, 빠진 지표만 아래 계산식으로 채웠다.
//    - V벨트 A-42, 볼트 M8×20, 베어링 6204: F-REVIEW-10 예시의 S·O·m·D95·D99·R
//    - 볼베어링 6205ZZ: F-SETUP-01 엑셀 예시(재고 3, ○○베어링상사 18,000원, 월 약 2개)
//      + F-REVIEW-10(D95 11, LT90 11일, 마감 11/9) + F-ANAL 본문(재주문점 4개)
//    - 오링 P-20: F-AUDIT-06 예시(장부상 14개). 카테고리는 "AI 가 못 정한 줄" 확인용으로 비워 둔다.
//    - 헥사볼트 M8x20: F-REVIEW-10 볼트 예시의 숨은 재고(H 800)
// 2) 가상 공장 부품 (factory.ts) — 이름·규격은 실제 규격품, 단가는 소량 구매 시세를 어림한 가상 값이다.
// 지표는 서버의 시뮬레이션(F-ANAL-07)이 아니라 정규 근사로 만든 목업 값이다.
import type { Category, DemandPattern, RiskLevel } from '../../domain/part';
import type { PartMetrics, StockMovement } from '../../types/part';
import {
  BASE_DATE,
  COMPUTED_AT,
  EQUIPMENT_FIXTURES,
  HISTORY_DAYS,
  MAINTENANCE_FIXTURES,
  formatLocation,
  seededRandom,
} from './factory';
import {
  PATTERN_CV,
  REVIEW_PERIOD_DAYS,
  addDays,
  maintenanceFor,
  stockoutDate,
  stockoutProb,
  type SimInput,
} from './simulate';

export type MockPart = {
  part_id: string;
  part_name: string;
  spec: string | null;
  category: Category | null;
  unit: string;
  stock: number | null;
  incoming: { qty: number; eta: string } | null;
  location: string | null;
  supplier: { name: string; unit_price: number | null } | null;
  metrics: PartMetrics;
  risk: RiskLevel | null;
  // 채팅 문장에서 이 부품을 알아보는 단어 (목업 전용 — 실제 매칭은 서버 F-MATCH-01)
  keywords: string[];
};

type Seed = {
  id: string;
  name: string;
  spec: string | null;
  category: Category | null;
  unit?: string;
  stock: number | null;
  loc: [string, number, number] | null; // 선반, 단, 칸
  supplier?: [string, number | null];
  m: number | null; // 월 소모량 — 이력 생성과 지표 계산에 쓴다
  pattern?: DemandPattern;
  lt?: [number, number]; // LT50, LT90 (일)
  moq?: number;
  incoming?: { qty: number; eta: string };
  keywords: string[];
  // 명세서에 적힌 지표 — 계산값보다 우선한다
  spec_metrics?: Partial<PartMetrics>;
  // 명세서 예시처럼 지표 일부만 있는 부품은 계산으로 채우지 않는다
  no_derive?: boolean;
  // 장부 의심 항목(fixtures/audits.ts)의 이유가 원장과 맞도록 이력에 심는 사건
  history?: {
    spikes?: { date: string; qty: number }[]; // 그날 평소보다 크게 나감 (F-AUDIT-04 급변)
    quiet_days?: number; // 최근 N일 출고가 뜸함 (F-AUDIT-03 소모 패턴 이탈)
    no_out_dates?: string[]; // 정비했는데 출고 기록이 없는 날 (F-AUDIT-02)
  };
};

// 카테고리 외부 요인 위험도 (F-EXT-02). 목업은 카테고리 단위로 고정한다: 해상운임·환율 영향이 큰 쪽을 높게.
const CATEGORY_RISK: Record<Category, RiskLevel> = {
  베어링: '높음',
  'V벨트·전동벨트': '정상',
  '볼트·너트': '정상',
  '절삭유·윤활유': '주의',
  '씰·오링': '정상',
  '공압·유압': '주의',
  절삭공구: '주의',
  필터: '정상',
};

// 순서가 중요하다: 채팅 목업은 앞에서부터 키워드를 찾는다. 규격 번호처럼 구체적인 단어를 가진 부품이 앞,
// "볼트"처럼 넓은 단어를 가진 명세서 예시 부품이 뒤에 온다("헥사볼트"는 "볼트"보다 앞).
const SEEDS: Seed[] = [
  // ---- 베어링 (B-01) ----
  {
    id: 'pt-bearing-6206zz',
    name: '볼베어링 6206ZZ',
    spec: '6206ZZ',
    category: '베어링',
    stock: 6,
    loc: ['B-01', 2, 3],
    supplier: ['신흥베어링', 9800],
    m: 2.5,
    pattern: 'intermittent',
    lt: [7, 12],
    keywords: ['6206'],
  },
  {
    id: 'pt-bearing-6305zz',
    name: '볼베어링 6305ZZ',
    spec: '6305ZZ',
    category: '베어링',
    stock: 2,
    loc: ['B-01', 3, 1],
    supplier: ['○○베어링상사', 14500],
    m: 1.2,
    pattern: 'lumpy',
    lt: [10, 16],
    moq: 4,
    keywords: ['6305'],
  },
  {
    id: 'pt-bearing-6001zz',
    name: '볼베어링 6001ZZ',
    spec: '6001ZZ',
    category: '베어링',
    stock: 14,
    loc: ['B-01', 1, 1],
    supplier: ['신흥베어링', 3200],
    m: 3,
    pattern: 'intermittent',
    lt: [5, 9],
    keywords: ['6001'],
  },
  {
    id: 'pt-pillow-ucp205',
    name: '필로우블록 UCP205',
    spec: 'UCP205',
    category: '베어링',
    stock: 4,
    loc: ['B-01', 1, 4],
    supplier: ['신흥베어링', 28000],
    m: 0.8,
    pattern: 'intermittent',
    lt: [5, 9],
    keywords: ['ucp', '필로우'],
  },
  // ---- 벨트 (A-01 1단·4단) ----
  {
    id: 'pt-vbelt-b50',
    name: 'V벨트 B-50',
    spec: 'B-50',
    category: 'V벨트·전동벨트',
    stock: 3,
    loc: ['A-01', 1, 2],
    supplier: ['대명동력', 16500],
    m: 1,
    pattern: 'intermittent',
    lt: [3, 6],
    keywords: ['b-50', 'b50'],
  },
  // 숨은 재고 예시 2 — 같은 규격(B-50)이 다른 이름으로 맨 위 칸에 있다 (F-MATCH-03)
  {
    id: 'pt-belt-b50-old',
    name: '전동벨트 B-50',
    spec: 'B-50',
    category: 'V벨트·전동벨트',
    stock: 5,
    loc: ['A-01', 4, 4],
    m: null,
    keywords: ['전동벨트'],
  },
  {
    id: 'pt-timing-htd',
    name: '타이밍벨트 HTD 5M-450',
    spec: '5M-450',
    category: 'V벨트·전동벨트',
    stock: 1,
    loc: ['A-01', 1, 3],
    supplier: ['대명동력', 32000],
    m: 0.5,
    pattern: 'lumpy',
    lt: [14, 25],
    keywords: ['타이밍', 'htd'],
  },
  // ---- 공압·유압 (A-01 2·3단) ----
  {
    id: 'pt-fitting-pc8',
    name: '원터치 피팅 PC8-02',
    spec: 'PC8-02',
    category: '공압·유압',
    stock: 35,
    loc: ['A-01', 2, 1],
    supplier: ['한울유공압', 1800],
    m: 12,
    pattern: 'erratic',
    lt: [3, 6],
    keywords: ['피팅', 'pc8'],
    history: { spikes: [{ date: '2026-11-03', qty: 14 }] },
  },
  {
    id: 'pt-air-hose-8',
    name: '우레탄 에어호스 Ø8',
    spec: 'Ø8×Ø5',
    category: '공압·유압',
    unit: 'm',
    stock: 40,
    loc: ['A-01', 2, 2],
    supplier: ['한울유공압', 1200],
    m: 15,
    pattern: 'smooth',
    lt: [3, 6],
    keywords: ['에어호스', '호스'],
  },
  {
    id: 'pt-solenoid-5p',
    name: '솔레노이드 밸브 5포트',
    spec: '1/4" DC24V',
    category: '공압·유압',
    stock: 1,
    loc: ['A-01', 3, 1],
    supplier: ['한울유공압', 85000],
    m: 0.3,
    pattern: 'lumpy',
    lt: [7, 14],
    keywords: ['솔레노이드', '밸브'],
  },
  {
    id: 'pt-cyl-seal-kit',
    name: '에어 실린더 씰 키트 Ø40',
    spec: 'Ø40',
    category: '공압·유압',
    unit: '세트',
    stock: 2,
    loc: ['A-01', 3, 2],
    supplier: ['한울유공압', 38000],
    m: 0.6,
    pattern: 'lumpy',
    lt: [7, 14],
    keywords: ['씰키트', '씰 키트'],
  },
  {
    id: 'pt-frl-unit',
    name: '에어 필터 레귤레이터',
    spec: '1/4"',
    category: '공압·유압',
    stock: 1,
    loc: ['A-01', 3, 3],
    supplier: ['한울유공압', 62000],
    m: 0.2,
    pattern: 'intermittent',
    lt: [5, 10],
    keywords: ['레귤레이터'],
  },
  {
    id: 'pt-hyd-packing',
    name: '유압 실린더 패킹 세트 Ø63',
    spec: 'Ø63',
    category: '공압·유압',
    unit: '세트',
    stock: 1,
    loc: ['A-01', 3, 4],
    supplier: ['한울유공압', 45000],
    m: 0.4,
    pattern: 'lumpy',
    lt: [10, 18],
    keywords: ['패킹'],
  },
  // ---- 볼트·너트 (B-02 1·2단) ----
  {
    id: 'pt-bolt-m10x30',
    name: '육각볼트 M10×30',
    spec: 'M10×30',
    category: '볼트·너트',
    stock: 160,
    loc: ['B-02', 1, 2],
    supplier: ['삼정볼트', 150],
    m: 90,
    pattern: 'smooth',
    lt: [2, 4],
    moq: 100,
    keywords: ['m10x30', 'm10×30'],
  },
  {
    id: 'pt-capscrew-m6x15',
    name: '렌치볼트 M6×15',
    spec: 'M6×15',
    category: '볼트·너트',
    stock: 240,
    loc: ['B-02', 1, 3],
    supplier: ['삼정볼트', 80],
    m: 120,
    pattern: 'smooth',
    lt: [2, 4],
    moq: 100,
    keywords: ['렌치볼트', 'm6'],
  },
  {
    id: 'pt-nut-m8',
    name: '육각너트 M8',
    spec: 'M8',
    category: '볼트·너트',
    stock: 300,
    loc: ['B-02', 1, 4],
    supplier: ['삼정볼트', 40],
    m: 150,
    pattern: 'smooth',
    lt: [2, 4],
    moq: 200,
    keywords: ['너트m8', 'm8너트'],
  },
  {
    id: 'pt-washer-m8',
    name: '평와셔 M8',
    spec: 'M8 평',
    category: '볼트·너트',
    stock: 500,
    loc: ['B-02', 2, 2],
    supplier: ['삼정볼트', 20],
    m: 160,
    pattern: 'smooth',
    lt: [2, 4],
    moq: 200,
    keywords: ['와셔'],
  },
  {
    id: 'pt-nut-m10',
    name: '육각너트 M10',
    spec: 'M10',
    category: '볼트·너트',
    stock: 30,
    loc: ['B-02', 2, 1],
    supplier: ['삼정볼트', 60],
    m: 80,
    pattern: 'smooth',
    lt: [2, 4],
    moq: 100,
    keywords: ['너트m10', 'm10너트'],
  },
  // ---- 씰·오링 (B-03 1단) ----
  {
    id: 'pt-oring-p30',
    name: '오링 P-30',
    spec: 'P-30',
    category: '씰·오링',
    stock: 18,
    loc: ['B-03', 1, 2],
    supplier: ['한울유공압', 350],
    m: 6,
    pattern: 'intermittent',
    lt: [3, 6],
    keywords: ['p-30', 'p30'],
  },
  {
    id: 'pt-oilseal-tc30',
    name: '오일씰 TC 30×47×7',
    spec: '30×47×7',
    category: '씰·오링',
    stock: 4,
    loc: ['B-03', 1, 3],
    supplier: ['한울유공압', 2500],
    m: 1.5,
    pattern: 'intermittent',
    lt: [3, 6],
    keywords: ['오일씰'],
    history: { no_out_dates: ['2026-10-30'] },
  },
  // ---- 절삭공구 (B-04 1단) ----
  {
    id: 'pt-endmill-10',
    name: '초경 엔드밀 Ø10 4날',
    spec: 'Ø10 4F',
    category: '절삭공구',
    stock: 2,
    loc: ['B-04', 1, 1],
    supplier: ['정우툴링', 42000],
    m: 4,
    pattern: 'erratic',
    lt: [3, 6],
    keywords: ['엔드밀'],
  },
  {
    id: 'pt-insert-cnmg',
    name: '선삭 인서트 CNMG120408',
    spec: 'CNMG120408',
    category: '절삭공구',
    stock: 12,
    loc: ['B-04', 1, 2],
    supplier: ['정우툴링', 9500],
    m: 30,
    pattern: 'smooth',
    lt: [4, 8],
    moq: 10,
    keywords: ['인서트', 'cnmg'],
  },
  {
    id: 'pt-drill-85',
    name: 'HSS 드릴 Ø8.5',
    spec: 'Ø8.5',
    category: '절삭공구',
    stock: 6,
    loc: ['B-04', 1, 3],
    supplier: ['정우툴링', 6500],
    m: 3,
    pattern: 'erratic',
    lt: [3, 6],
    keywords: ['드릴'],
  },
  {
    id: 'pt-tap-m10',
    name: '핸드탭 M10×1.5',
    spec: 'M10×1.5',
    category: '절삭공구',
    stock: 4,
    loc: ['B-04', 1, 4],
    supplier: ['정우툴링', 12000],
    m: 1,
    pattern: 'intermittent',
    lt: [3, 6],
    keywords: ['탭'],
  },
  // ---- 필터 (C-01·C-02 1단) ----
  {
    id: 'pt-filter-intake',
    name: '컴프레서 흡입필터',
    spec: '22kW용',
    category: '필터',
    stock: 2,
    loc: ['C-01', 1, 1],
    supplier: ['한울유공압', 18000],
    m: 0.5,
    pattern: 'intermittent',
    lt: [3, 7],
    keywords: ['흡입필터'],
  },
  {
    id: 'pt-filter-oil',
    name: '컴프레서 오일필터',
    spec: '22kW용 OF',
    category: '필터',
    stock: 1,
    loc: ['C-01', 1, 2],
    supplier: ['한울유공압', 22000],
    m: 0.3,
    pattern: 'intermittent',
    lt: [3, 7],
    keywords: ['오일필터'],
  },
  {
    id: 'pt-filter-return',
    name: '유압 리턴필터 10μm',
    spec: '10μm',
    category: '필터',
    stock: 1,
    loc: ['C-02', 1, 1],
    supplier: ['한울유공압', 48000],
    m: 0.4,
    pattern: 'intermittent',
    lt: [7, 12],
    keywords: ['리턴필터'],
  },
  {
    id: 'pt-filter-bag',
    name: '절삭유 필터백 25μm',
    spec: '25μm',
    category: '필터',
    stock: 12,
    loc: ['C-02', 1, 2],
    supplier: ['한울유공압', 7000],
    m: 6,
    pattern: 'smooth',
    lt: [3, 7],
    keywords: ['필터백'],
  },
  // ---- 절삭유·윤활유 (A-02 1단) ----
  {
    id: 'pt-coolant-20l',
    name: '수용성 절삭유 20L',
    spec: '20L',
    category: '절삭유·윤활유',
    unit: '통',
    stock: 3,
    loc: ['A-02', 1, 1],
    supplier: ['서해오일', 98000],
    m: 2.5,
    pattern: 'smooth',
    lt: [3, 5],
    keywords: ['절삭유'],
  },
  {
    id: 'pt-hydoil-vg46',
    name: '유압유 ISO VG46 20L',
    spec: 'VG46 20L',
    category: '절삭유·윤활유',
    unit: '통',
    stock: 2,
    loc: ['A-02', 1, 2],
    supplier: ['서해오일', 75000],
    m: 0.7,
    pattern: 'intermittent',
    lt: [3, 5],
    keywords: ['유압유', 'vg46'],
  },
  {
    id: 'pt-grease-2',
    name: '그리스 #2 400g',
    spec: '#2 400g',
    category: '절삭유·윤활유',
    stock: 10,
    loc: ['A-02', 1, 3],
    supplier: ['서해오일', 5500],
    m: 4,
    pattern: 'smooth',
    lt: [3, 5],
    keywords: ['그리스'],
    history: { quiet_days: 21 },
  },
  {
    id: 'pt-slideway-68',
    name: '습동면유 ISO VG68 20L',
    spec: 'VG68 20L',
    category: '절삭유·윤활유',
    unit: '통',
    stock: 1,
    loc: ['A-02', 1, 4],
    supplier: ['서해오일', 88000],
    m: 0.4,
    pattern: 'intermittent',
    lt: [3, 5],
    keywords: ['습동면유', 'vg68'],
  },

  // ---- 명세서 예시 부품 ----
  {
    id: 'pt-vbelt-a42',
    name: 'V벨트 A-42',
    spec: 'A-42',
    category: 'V벨트·전동벨트',
    stock: 2,
    loc: ['A-01', 1, 1],
    supplier: ['대명동력', 13000],
    m: 1.5,
    pattern: 'intermittent',
    lt: [3, 6],
    incoming: { qty: 10, eta: '2026-11-08' },
    keywords: ['v벨트', '브이벨트'],
    spec_metrics: { m: 1.5, D95: 4, D99: 5, R: 0 },
  },
  {
    id: 'pt-hexbolt-m8x20',
    name: '헥사볼트 M8x20',
    spec: 'M8x20',
    category: '볼트·너트',
    stock: 800,
    loc: ['B-02', 4, 4],
    m: null,
    keywords: ['헥사'],
  },
  {
    id: 'pt-bolt-m8x20',
    name: '육각볼트 M8×20',
    spec: 'M8×20',
    category: '볼트·너트',
    stock: 40,
    loc: ['B-02', 1, 1],
    supplier: ['삼정볼트', 110],
    m: 60,
    pattern: 'smooth',
    lt: [2, 4],
    keywords: ['m8', '볼트'],
    spec_metrics: { D95: 120, R: 0 },
  },
  {
    id: 'pt-bearing-6205zz',
    name: '볼베어링 6205ZZ',
    spec: '6205ZZ',
    category: '베어링',
    stock: 3,
    loc: ['B-01', 2, 2],
    supplier: ['○○베어링상사', 18000],
    m: 2,
    pattern: 'intermittent',
    lt: [7, 11],
    moq: 10,
    keywords: ['6205'],
    spec_metrics: {
      m: 2,
      D95: 11,
      reorder_point: 4,
      R: 8,
      LT90: 11,
      t_out: '2026-11-20',
      t_deadline: '2026-11-09',
      estimated: true,
    },
  },
  {
    id: 'pt-bearing-6204',
    name: '볼베어링 6204',
    spec: '6204',
    category: '베어링',
    stock: null,
    loc: ['B-01', 2, 1],
    m: null,
    keywords: ['6204'],
    spec_metrics: { R: 10 },
    no_derive: true,
  },
  {
    id: 'pt-oring-p20',
    name: '오링 P-20',
    spec: 'P-20',
    category: null,
    stock: 14,
    loc: ['B-03', 1, 1],
    m: 8,
    pattern: 'intermittent',
    lt: [3, 6],
    keywords: ['오링', 'p-20', 'p20'],
  },
];

// ---- 지표 계산 (목업) — 예측 경로는 simulate.ts 한 곳 ----
const emptyMetrics = (): PartMetrics => ({
  computed_at: COMPUTED_AT,
  abc: null,
  demand_pattern: null,
  m: null,
  D95: null,
  D99: null,
  reorder_point: null,
  R: null,
  LT50: null,
  LT90: null,
  t_out: null,
  t_deadline: null,
  p_out: null,
  loss: null,
  estimated: false,
});

// 결품 시 손실 L (F-ANAL-08): 이 부품을 쓰는 설비가 보통 납기(긴급 발주) 동안 멈춘다고 본다. 손실액이 등록된 설비만.
const lossOf = (partId: string, leadDays: number) => {
  const daily = EQUIPMENT_FIXTURES.filter((e) => e.parts.some((p) => p.part_id === partId))
    .map((e) => (e.hourly_loss && e.daily_hours ? e.hourly_loss * e.daily_hours : null))
    .filter((v) => v !== null);
  return daily.length ? Math.max(...daily) * leadDays : null;
};

const derive = (s: Seed): PartMetrics => {
  const base = emptyMetrics();
  if (s.no_derive || s.m === null || s.stock === null || !s.lt)
    return { ...base, ...s.spec_metrics };
  const [LT50, LT90] = s.lt;
  const pattern = s.pattern ?? 'insufficient';
  const daily = s.m / 30;
  const period = LT90 + REVIEW_PERIOD_DAYS;
  // 정비 일정의 확정 필요량 F — 기간 안에 잡힌 정비는 예측이 아니라 확정 수요로 더한다
  const maintenance = maintenanceFor(s.id, MAINTENANCE_FIXTURES, BASE_DATE);
  const input: SimInput = {
    stock: s.stock,
    daily,
    cv: PATTERN_CV[pattern],
    LT90,
    arrivals: s.incoming ? [s.incoming] : [],
    maintenance,
  };
  const mean =
    daily * period +
    maintenance
      .filter((m) => m.date <= addDays(BASE_DATE, period))
      .reduce((sum, m) => sum + m.qty, 0);
  const sd = Math.max(mean * PATTERN_CV[pattern], 0.5);
  const D95 = Math.ceil(mean + 1.645 * sd);
  const D99 = Math.ceil(mean + 2.326 * sd);
  const available = s.stock + (s.incoming?.qty ?? 0);
  const need = D95 + s.m - available;
  const R = available <= D95 && need > 0 ? Math.max(s.moq ?? 1, Math.ceil(need)) : 0;
  const tOut = stockoutDate(input, BASE_DATE);
  const pOut = stockoutProb(input, BASE_DATE, 0, s.stock);
  return {
    ...base,
    demand_pattern: pattern,
    m: s.m,
    D95,
    D99,
    reorder_point: D95,
    R,
    LT50,
    LT90,
    t_out: tOut,
    t_deadline: tOut ? addDays(tOut, -LT90) : null,
    p_out: pOut,
    loss: pOut >= 0.1 ? lossOf(s.id, LT50) : null,
    ...s.spec_metrics,
  };
};

// ABC: 연간 사용 금액 누적 80% → A, 95% → B, 나머지 C (F-ANAL-01)
const withAbc = (parts: MockPart[]) => {
  const value = (p: MockPart) => (p.metrics.m ?? 0) * 12 * (p.supplier?.unit_price ?? 0);
  const ranked = parts.filter((p) => value(p) > 0).sort((a, b) => value(b) - value(a));
  const total = ranked.reduce((sum, p) => sum + value(p), 0);
  let acc = 0;
  for (const p of ranked) {
    acc += value(p);
    p.metrics.abc = acc / total <= 0.8 ? 'A' : acc / total <= 0.95 ? 'B' : 'C';
  }
  return parts;
};

export const PART_FIXTURES: MockPart[] = withAbc(
  SEEDS.map((s) => ({
    part_id: s.id,
    part_name: s.name,
    spec: s.spec,
    category: s.category,
    unit: s.unit ?? '개',
    stock: s.stock,
    incoming: s.incoming ?? null,
    location: s.loc ? formatLocation(...s.loc) : null,
    supplier: s.supplier ? { name: s.supplier[0], unit_price: s.supplier[1] } : null,
    metrics: derive(s),
    risk: s.category ? CATEGORY_RISK[s.category] : null,
    keywords: s.keywords,
  })),
);

// ---- 사용 이력 (원장, F-LEDGER-01) ----
// 지난 90일 + 오늘 아침(기준일 8~9시, 대시보드 "현장 기록"이 비지 않게). 오늘 재고에서 거꾸로 거슬러 올라가며 출고를 더하고, 재고가 넉넉해지는 날에 입고를 넣는다.
// 그래서 마지막 재고는 항상 고정 데이터의 stock 과 같고, 중간에 음수가 되지 않는다.
// 가장 처음 날의 재고는 엑셀 이관의 실사조정(ADJUST)으로 들어간다 (F-SETUP-01).

// 하루에 쓰는 확률과 한 번에 쓰는 양
const USAGE: Record<DemandPattern, { chance: (daily: number) => number; spread: number }> = {
  smooth: { chance: () => 0.75, spread: 0.35 },
  erratic: { chance: () => 0.5, spread: 0.9 },
  intermittent: { chance: (d) => Math.min(0.5, d * 1.2), spread: 0.4 },
  lumpy: { chance: (d) => Math.min(0.25, d * 0.6), spread: 1 },
  insufficient: { chance: () => 0.1, spread: 0.5 },
};

const OUT_TEMPLATES = [
  (n: string, q: string) => `${n} ${q} 씀`,
  (n: string, q: string) => `${n} ${q} 꺼냄`,
  (n: string, q: string) => `${n} ${q} 교체했어요`,
  (n: string, q: string) => `${n} ${q} 출고`,
];

const kstIso = (ymd: string, hour: number, minute: number) =>
  `${ymd}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`;

const isWeekend = (ymd: string) => [0, 6].includes(new Date(`${ymd}T00:00:00Z`).getUTCDay());

const buildHistory = (p: MockPart, seed: Seed): StockMovement[] => {
  if (p.stock === null) return [];
  const random = seededRandom(p.part_id);
  const start = addDays(BASE_DATE, -HISTORY_DAYS);
  const importEntry = (qty: number): StockMovement => ({
    id: `mv-init-${p.part_id}`,
    type: 'ADJUST',
    qty,
    message: null,
    reason: '초기 재고 (엑셀 이관)',
    created_at: kstIso(start, 9, 0),
  });
  if (seed.m === null) return [importEntry(p.stock)];

  const daily = seed.m / 30;
  const usage = USAGE[seed.pattern ?? 'insufficient'];
  const chance = usage.chance(daily);
  const batch = Math.max(seed.moq ?? 1, Math.ceil(seed.m * 1.5));
  const cap = Math.max((p.metrics.reorder_point ?? 0) + batch, p.stock);
  const events: StockMovement[] = [];
  let after = p.stock;

  for (let back = 0; back <= HISTORY_DAYS; back++) {
    const day = addDays(BASE_DATE, -back);
    let out = 0;
    const quiet = back > 0 && back <= (seed.history?.quiet_days ?? 0);
    if (!isWeekend(day) && random() < (quiet ? chance * 0.4 : chance)) {
      const size = (daily / chance) * (1 + usage.spread * (random() * 2 - 1));
      out = Math.max(1, Math.round(size));
    }
    if (seed.history?.no_out_dates?.includes(day)) out = 0;
    out += seed.history?.spikes?.find((x) => x.date === day)?.qty ?? 0;
    let before = after + out;
    let incoming = 0;
    if (before > cap && random() < 0.6) {
      incoming = Math.min(batch, before);
      before -= incoming;
    }
    if (out) {
      const qty = `${out}${p.unit}`;
      events.push({
        id: `mv-${p.part_id}-${back}-out`,
        type: 'OUT',
        qty: -out,
        message: OUT_TEMPLATES[Math.floor(random() * OUT_TEMPLATES.length)](p.part_name, qty),
        reason: null,
        created_at: kstIso(
          day,
          back === 0 ? 8 + Math.floor(random() * 2) : 9 + Math.floor(random() * 8),
          Math.floor(random() * 60),
        ),
      });
    }
    if (incoming) {
      events.push({
        id: `mv-${p.part_id}-${back}-in`,
        type: 'IN',
        qty: incoming,
        message: `${p.part_name} ${incoming}${p.unit} 들어왔어요`,
        reason: null,
        // 같은 날이면 입고가 출고보다 먼저다
        created_at: kstIso(day, 8, Math.floor(random() * 30)),
      });
    }
    after = before;
  }
  return [importEntry(after), ...events.reverse()].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  );
};

export const LEDGER_FIXTURES = new Map(
  PART_FIXTURES.map((p, i) => [p.part_id, buildHistory(p, SEEDS[i])]),
);
