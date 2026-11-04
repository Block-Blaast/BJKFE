// 개발용 목업 부품 — 값은 모두 명세서 예시에서 가져왔고, 없는 값은 null 로 비웠다.
// - V벨트 A-42, 볼트 M8×20, 베어링 6204: F-REVIEW-10 예시의 S·O·m·D95·D99·R
// - 볼베어링 6205ZZ: F-SETUP-01 엑셀 예시(재고 3, ○○베어링상사 18,000원, 월 약 2개, B선반 2칸)
//   + F-REVIEW-10(D95 11, LT90 11일, 마감 11/9) + F-ANAL 본문(재주문점 시뮬레이션 4개)
// - 오링 P-20: F-AUDIT-06 예시(장부상 14개)
// - 헥사볼트 M8x20: F-REVIEW-10 볼트 예시의 숨은 재고(H 800). 이름은 F-MATCH-01 동의어 예시("육각" ↔ "헥사")로 지었다.
import type { Category } from '../../domain/part';
import type { PartMetrics } from '../../types/part';

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
  // 채팅 문장에서 이 부품을 알아보는 단어 (목업 전용 — 실제 매칭은 서버 F-MATCH-01)
  keywords: string[];
};

const COMPUTED_AT = '2026-11-05T03:00:00+09:00';

const emptyMetrics = (overrides: Partial<PartMetrics> = {}): PartMetrics => ({
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
  estimated: false,
  ...overrides,
});

// 순서가 중요하다: 채팅 목업은 앞에서부터 키워드를 찾는다. "헥사볼트"가 "볼트"보다 먼저 와야 한다.
export const PART_FIXTURES: MockPart[] = [
  {
    part_id: 'pt-vbelt-a42',
    part_name: 'V벨트 A-42',
    spec: 'A-42',
    category: 'V벨트·전동벨트',
    unit: '개',
    stock: 2,
    incoming: { qty: 10, eta: '2026-11-08' },
    location: null,
    supplier: null,
    metrics: emptyMetrics({ m: 1.5, D95: 4, D99: 5, R: 0 }),
    keywords: ['v벨트', '브이벨트'],
  },
  {
    part_id: 'pt-hexbolt-m8x20',
    part_name: '헥사볼트 M8x20',
    spec: 'M8x20',
    category: '볼트·너트',
    unit: '개',
    stock: 800,
    incoming: null,
    location: null,
    supplier: null,
    metrics: emptyMetrics(),
    keywords: ['헥사'],
  },
  {
    part_id: 'pt-bolt-m8x20',
    part_name: '육각볼트 M8×20',
    spec: 'M8×20',
    category: '볼트·너트',
    unit: '개',
    stock: 40,
    incoming: null,
    location: null,
    supplier: null,
    metrics: emptyMetrics({ D95: 120, R: 0 }),
    keywords: ['m8', '볼트'],
  },
  {
    part_id: 'pt-bearing-6205zz',
    part_name: '볼베어링 6205ZZ',
    spec: '6205ZZ',
    category: '베어링',
    unit: '개',
    stock: 3,
    incoming: null,
    location: 'B선반 2칸',
    supplier: { name: '○○베어링상사', unit_price: 18000 },
    metrics: emptyMetrics({
      m: 2,
      D95: 11,
      reorder_point: 4,
      R: 8,
      LT90: 11,
      t_out: '2026-11-20',
      t_deadline: '2026-11-09',
      estimated: true,
    }),
    keywords: ['6205'],
  },
  {
    part_id: 'pt-bearing-6204',
    part_name: '볼베어링 6204',
    spec: '6204',
    category: '베어링',
    unit: '개',
    stock: null,
    incoming: null,
    location: null,
    supplier: null,
    metrics: emptyMetrics({ R: 10 }),
    keywords: ['6204'],
  },
  {
    part_id: 'pt-oring-p20',
    part_name: '오링 P-20',
    spec: 'P-20',
    category: null,
    unit: '개',
    stock: 14,
    incoming: null,
    location: null,
    supplier: null,
    metrics: emptyMetrics(),
    keywords: ['오링', 'p-20', 'p20'],
  },
];
