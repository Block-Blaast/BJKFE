import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import {
  CATEGORIES,
  type AbcClass,
  type Category,
  type DemandPattern,
  type MovementType,
  type RiskLevel,
} from './domain/part';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { StockForecast } from './types/forecast';
import type { Part, PartListFilters, PartMetrics, StockMovement } from './types/part';

// ---- 백엔드 부품 형식 (BJK-AI-BE docs/api-spec/parts.md SET-03·SET-04·LED-01, 재고 예측선 #258) ----
// 화면은 지금 Part 형식을 그대로 쓰고, 여기서 백엔드 응답을 그 형식으로 바꾼다.
type BackendRisk = 'normal' | 'caution' | 'high';

type Page<T> = { items: T[]; next_cursor: string | null };

type BackendListItem = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  stock: number;
  abc: AbcClass | null;
  demand_class: DemandPattern | null;
  ledger_status: 'normal' | 'suspect';
  t_out: string | null;
  p_out: number | null;
  risk_level: BackendRisk | null;
  computed_at: string | null;
};

type BackendMetrics = {
  abc: AbcClass;
  demand_class: DemandPattern;
  data_mode: 'statistical' | 'estimated';
  m: number;
  default_supplier: { id: string; name: string; LT50: number; LT90: number } | null;
  D95: number;
  D99: number;
  reorder_point: number;
  t_out: string | null;
  t_deadline: string | null;
  p_out: number;
  loss: { L: number; equipment: string[]; is_estimate: boolean };
  R: number;
  external_level: BackendRisk;
  computed_at: string;
};

type BackendDetail = {
  id: string;
  name: string;
  spec: Record<string, string | number>;
  unit: string;
  category: { id: string; name: string; import_dependency: 'high' | 'medium' | 'low' } | null;
  stock: { S: number; hidden: { H_c: number; H_u: number } };
  metrics: BackendMetrics | null;
  supplier_metrics: { supplier_id: string; name: string; unit_price: number }[];
  aliases: { text: string }[];
};

type BackendMovement = {
  id: string;
  type: MovementType;
  qty: number;
  occurred_at: string;
  source_text: string | null;
  reason: string | null;
};

type BackendForecast = {
  as_of: string;
  computed_at: string | null;
  order_qty: number;
  reorder_point: number | null;
  t_out: string | null;
  days: { date: string; with_order: number; without_order: number }[];
};

const RISK: Record<BackendRisk, RiskLevel> = { normal: '정상', caution: '주의', high: '높음' };
const BACK_RISK = Object.fromEntries(Object.entries(RISK).map(([k, v]) => [v, k])) as Record<
  RiskLevel,
  BackendRisk
>;

// 카테고리는 회사가 이름을 정한다. 화면 상수에 없는 이름은 카테고리 없음으로 둔다
const toCategory = (name: string | null | undefined): Category | null =>
  name && (CATEGORIES as readonly string[]).includes(name) ? (name as Category) : null;

// 규격은 키·값 객체로 온다 (예: { bearing_no: "6205", shield: "ZZ" }). 화면은 값만 이어 보여준다
const toSpec = (spec: Record<string, string | number>) => Object.values(spec).join(' ') || null;

const EMPTY_METRICS: PartMetrics = {
  computed_at: null,
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
};

// 목록(SET-03)은 이름·재고와 지표 일부만 준다. 규격·공급사·숨은 재고·별칭은 상세에만 있고, 보관 위치·입고 예정은 어디에도 없다
const fromListItem = (p: BackendListItem): Part => ({
  id: p.id,
  name: p.name,
  spec: null,
  category: toCategory(p.category),
  unit: p.unit,
  stock: p.stock,
  incoming: null,
  hidden_stock: 0,
  risk: p.risk_level ? RISK[p.risk_level] : null,
  location: null,
  supplier: null,
  aliases: [],
  metrics: {
    ...EMPTY_METRICS,
    computed_at: p.computed_at,
    abc: p.abc,
    demand_pattern: p.demand_class,
    t_out: p.t_out,
    p_out: p.p_out,
  },
});

const fromDetail = (p: BackendDetail): Part => {
  const m = p.metrics;
  const supplier = m?.default_supplier ?? null;
  const price = p.supplier_metrics.find((s) => s.supplier_id === supplier?.id);
  return {
    id: p.id,
    name: p.name,
    spec: toSpec(p.spec),
    category: toCategory(p.category?.name),
    unit: p.unit,
    stock: p.stock.S,
    // 발주 테이블 전이라 백엔드 입고 예정은 늘 빈 목록이다 (parts.md "현재 구현 범위")
    incoming: null,
    // 확인된(H_c)·미확인(H_u) 숨은 재고를 합쳐 보여준다
    hidden_stock: p.stock.hidden.H_c + p.stock.hidden.H_u,
    risk: m ? RISK[m.external_level] : null,
    // 상세 응답에 보관 위치가 없다
    location: null,
    // 기본 공급사는 새벽 계산 지표에만 있다 — 계산 전이면 공급사가 없는 것으로 보인다
    supplier: supplier ? { name: supplier.name, unit_price: price?.unit_price ?? null } : null,
    aliases: p.aliases.map((a) => a.text),
    metrics: m
      ? {
          computed_at: m.computed_at,
          abc: m.abc,
          demand_pattern: m.demand_class,
          m: m.m,
          D95: m.D95,
          D99: m.D99,
          reorder_point: m.reorder_point,
          R: m.R,
          LT50: supplier?.LT50 ?? null,
          LT90: supplier?.LT90 ?? null,
          t_out: m.t_out,
          t_deadline: m.t_deadline,
          p_out: m.p_out,
          loss: m.loss.L,
          estimated: m.data_mode === 'estimated',
        }
      : EMPTY_METRICS,
  };
};

// 커서 목록은 한 번에 최대 100개라 next_cursor 가 없을 때까지 이어 받는다
const fetchAll = async <T>(path: string, params = new URLSearchParams()) => {
  const items: T[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams(params);
    query.set('limit', '100');
    if (cursor) query.set('cursor', cursor);
    const page: Page<T> = await request<Page<T>>(`${path}?${query.toString()}`);
    items.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return items;
};

// 화면 필터 → 백엔드 쿼리. 카테고리는 백엔드가 id 로만 거르고, 위험도 '정상'은 백엔드 필터에 없어 받은 뒤 거른다
const toParams = ({ q, abc, pattern, risk }: PartListFilters) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (abc) params.set('abc', abc);
  if (pattern) params.set('demand_class', pattern);
  if (risk && risk !== '정상') params.set('risk', BACK_RISK[risk]);
  return params;
};

export const getParts = async (filters: PartListFilters) =>
  (await fetchAll<BackendListItem>(ENDPOINTS.parts, toParams(filters)))
    .map(fromListItem)
    .filter(
      (p) =>
        (!filters.category || p.category === filters.category) &&
        (filters.risk !== '정상' || p.risk === '정상'),
    );

export const getPart = async (id: string) =>
  fromDetail(await request<BackendDetail>(ENDPOINTS.part(id)));

export const getPartLedger = async (id: string) =>
  (await fetchAll<BackendMovement>(ENDPOINTS.partLedger(id))).map((r): StockMovement => ({
    id: r.id,
    type: r.type,
    qty: r.qty,
    message: r.source_text,
    reason: r.reason,
    created_at: r.occurred_at,
  }));

// 백엔드 예측선은 오늘부터 일별 값만 준다 — 실적선·발주 마감일·단위는 없다. 새벽 계산 전이면 days 가 빈다
export const getPartForecast = async (id: string, unit: string): Promise<StockForecast> => {
  const raw = await request<BackendForecast>(ENDPOINTS.partForecast(id));
  const hasDays = raw.days.length > 0;
  return {
    unit,
    today: raw.as_of,
    computed_at: raw.computed_at,
    reorder_point: raw.reorder_point,
    deadline: null,
    order_qty: raw.order_qty || null,
    actual: [],
    without_order: hasDays ? raw.days.map((d) => ({ date: d.date, qty: d.without_order })) : null,
    with_order:
      hasDays && raw.order_qty ? raw.days.map((d) => ({ date: d.date, qty: d.with_order })) : null,
    is_mock: false,
  };
};

export const partQueries = {
  list: (filters: PartListFilters) =>
    queryOptions({ queryKey: queryKeys.parts.list(filters), queryFn: () => getParts(filters) }),
  detail: (id: string) =>
    queryOptions({ queryKey: queryKeys.parts.detail(id), queryFn: () => getPart(id) }),
  ledger: (id: string) =>
    queryOptions({ queryKey: queryKeys.parts.ledger(id), queryFn: () => getPartLedger(id) }),
  // 예측선 응답에 단위가 없어 같은 캐시의 부품 상세에서 읽는다 (상세 화면이 함께 불러오므로 요청은 한 번)
  forecast: (id: string) =>
    queryOptions({
      queryKey: queryKeys.parts.forecast(id),
      queryFn: async ({ client }) => {
        const part = await client.ensureQueryData(partQueries.detail(id));
        return getPartForecast(id, part.unit);
      },
    }),
};
