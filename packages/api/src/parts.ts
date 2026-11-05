import { queryOptions } from '@tanstack/react-query';

import { itemsOf, request, USES_BACKEND } from './client';
import type { Category, DemandPattern, MovementType, RiskLevel } from './domain/part';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { StockForecast } from './types/forecast';
import type { Part, PartListFilters, StockMovement } from './types/part';

// ---- 백엔드 부품 형식 (SET-03·04, LED-01, 예측선 #258) ----
// 화면은 지금 Part 형식을 그대로 쓰고, 여기서 백엔드 응답을 그 형식으로 바꾼다. 목업은 Part 를 그대로 준다.
type BackendLevel = 'normal' | 'caution' | 'high';

type BackendListItem = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  stock: number;
  abc: Part['metrics']['abc'];
  demand_class: DemandPattern | null;
  t_out: string | null;
  p_out: number | null;
  risk_level: BackendLevel | null;
  computed_at: string | null;
};

type BackendDetail = {
  id: string;
  name: string;
  spec: Record<string, string | number> | null;
  unit: string;
  category: { id: string; name: string } | null;
  stock: { S: number; hidden: { H_c: number; H_u: number } };
  metrics: {
    abc: Part['metrics']['abc'];
    demand_class: DemandPattern | null;
    data_mode: 'statistical' | 'estimated';
    m: number | null;
    default_supplier: { id: string; name: string; LT50: number | null; LT90: number | null } | null;
    D95: number | null;
    D99: number | null;
    reorder_point: number | null;
    t_out: string | null;
    t_deadline: string | null;
    p_out: number | null;
    loss: { L: number | null } | null;
    R: number | null;
    external_level: BackendLevel | null;
    computed_at: string | null;
  } | null;
  supplier_metrics: { supplier_id: string; name: string; unit_price: number | null }[];
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

export type BackendForecast = {
  as_of: string;
  computed_at: string | null;
  order_qty: number | null;
  reorder_point: number | null;
  days: { date: string; with_order: number; without_order: number }[];
};

export const RISK_LABEL: Record<BackendLevel, RiskLevel> = {
  normal: '정상',
  caution: '주의',
  high: '높음',
};
const RISK_BACK: Partial<Record<RiskLevel, BackendLevel>> = { 주의: 'caution', 높음: 'high' };

const EMPTY_METRICS: Part['metrics'] = {
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

// 백엔드 카테고리는 회사가 정한 이름이라 화면 상수(CATEGORIES)에 없는 이름도 그대로 보여 준다
const fromListItem = (p: BackendListItem): Part => ({
  id: p.id,
  name: p.name,
  spec: null,
  category: p.category as Category | null,
  unit: p.unit,
  stock: p.stock,
  incoming: null,
  hidden_stock: 0,
  risk: p.risk_level ? RISK_LABEL[p.risk_level] : null,
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

// 규격은 { bearing_no: '6205', shield: 'ZZ' } 처럼 키·값으로 온다 — 화면은 값만 이어 보여 준다
const specText = (spec: BackendDetail['spec']) =>
  spec && Object.keys(spec).length ? Object.values(spec).join(' ') : null;

const fromDetail = (p: BackendDetail): Part => {
  const m = p.metrics;
  const supplier = m?.default_supplier ?? null;
  return {
    id: p.id,
    name: p.name,
    spec: specText(p.spec),
    category: (p.category?.name ?? null) as Category | null,
    unit: p.unit,
    stock: p.stock.S,
    // 열린 발주 잔량은 상세가 주지 않는다(예측선에만 반영된다)
    incoming: null,
    hidden_stock: p.stock.hidden.H_c + p.stock.hidden.H_u,
    risk: m?.external_level ? RISK_LABEL[m.external_level] : null,
    location: null,
    supplier: supplier
      ? {
          name: supplier.name,
          unit_price:
            p.supplier_metrics.find((s) => s.supplier_id === supplier.id)?.unit_price ?? null,
        }
      : null,
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
          loss: m.loss?.L ?? null,
          // 사용 기록이 모자라면 백엔드가 월 사용 추정치로 계산한다 (F-SETUP-04)
          estimated: m.data_mode === 'estimated',
        }
      : EMPTY_METRICS,
  };
};

const fromMovement = (mv: BackendMovement): StockMovement => ({
  id: mv.id,
  type: mv.type,
  qty: mv.qty,
  message: mv.source_text,
  reason: mv.reason,
  created_at: mv.occurred_at,
});

// 백엔드 예측선은 오늘부터 8주 일별 값만 준다 — 실적선은 없다. 검토 예측선(REV #258)도 같은 모양이다
export const fromBackendForecast = (raw: BackendForecast, unit: string): StockForecast => ({
  unit,
  today: raw.as_of,
  computed_at: raw.computed_at,
  reorder_point: raw.reorder_point,
  deadline: null,
  order_qty: raw.order_qty,
  actual: [],
  without_order: raw.days.length
    ? raw.days.map((d) => ({ date: d.date, qty: d.without_order }))
    : null,
  with_order:
    raw.order_qty && raw.days.length
      ? raw.days.map((d) => ({ date: d.date, qty: d.with_order }))
      : null,
  is_mock: false,
});

// 카테고리 필터는 백엔드가 category_id 로 받는데 화면은 이름으로 고른다 — 받은 뒤 이름으로 거른다
const toSearch = (filters: PartListFilters) => {
  const params = new URLSearchParams();
  if (USES_BACKEND) {
    if (filters.q) params.set('q', filters.q);
    if (filters.abc) params.set('abc', filters.abc);
    if (filters.pattern) params.set('demand_class', filters.pattern);
    const risk = filters.risk && RISK_BACK[filters.risk];
    if (risk) params.set('risk', risk);
    params.set('limit', '100');
  } else {
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

const isBackendListItem = (p: Part | BackendListItem): p is BackendListItem => 'demand_class' in p;

export const getParts = async (filters: PartListFilters) => {
  const raw = await request<Part[] | { items: BackendListItem[] }>(
    `${ENDPOINTS.parts}${toSearch(filters)}`,
  );
  const list = itemsOf<Part | BackendListItem>(raw).map((p) =>
    isBackendListItem(p) ? fromListItem(p) : p,
  );
  // 위험도 '정상'은 백엔드 필터에 없다
  return list
    .filter((p) => !filters.category || p.category === filters.category)
    .filter((p) => !filters.risk || p.risk === filters.risk);
};

export const getPart = async (id: string) => {
  const raw = await request<Part | BackendDetail>(ENDPOINTS.part(id));
  return 'supplier_metrics' in raw ? fromDetail(raw) : raw;
};

export const getPartLedger = async (id: string) => {
  const raw = await request<StockMovement[] | { items: BackendMovement[] }>(
    USES_BACKEND ? `${ENDPOINTS.partLedger(id)}?limit=100` : ENDPOINTS.partLedger(id),
  );
  return Array.isArray(raw) ? raw : raw.items.map(fromMovement);
};

// 예측선에는 단위가 없다 — 그래프 단위는 '개'로 둔다
export const getPartForecast = async (id: string) => {
  const raw = await request<StockForecast | BackendForecast>(ENDPOINTS.partForecast(id));
  return 'days' in raw ? fromBackendForecast(raw, '개') : raw;
};

export const partQueries = {
  list: (filters: PartListFilters) =>
    queryOptions({ queryKey: queryKeys.parts.list(filters), queryFn: () => getParts(filters) }),
  detail: (id: string) =>
    queryOptions({ queryKey: queryKeys.parts.detail(id), queryFn: () => getPart(id) }),
  ledger: (id: string) =>
    queryOptions({ queryKey: queryKeys.parts.ledger(id), queryFn: () => getPartLedger(id) }),
  forecast: (id: string) =>
    queryOptions({ queryKey: queryKeys.parts.forecast(id), queryFn: () => getPartForecast(id) }),
};
