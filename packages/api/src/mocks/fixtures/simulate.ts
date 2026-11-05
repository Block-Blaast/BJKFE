// 목업 예측 — 서버의 8주 경로 시뮬레이션(F-ANAL-07)을 흉내 낸 "중앙값 경로" 하나.
// 부품 지표(t_out·p_out), 검토 의견서, 3D 창고 예측(/twin/projection)이 모두 이 함수를 쓴다.
// 그래서 화면마다 숫자가 어긋나지 않는다. (3D 는 계산하지 않고 이 결과를 그리기만 한다)
import type { DemandPattern } from '../../domain/part';

const DAY_MS = 24 * 60 * 60 * 1000;

export const addDays = (ymd: string, days: number) =>
  new Date(Date.parse(`${ymd}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

// 표준정규 누적분포 (Abramowitz-Stegun 근사)
export const phi = (z: number) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
};

// 기간 수요의 변동계수 — 패턴이 들쭉날쭉할수록 크게 잡는다
export const PATTERN_CV: Record<DemandPattern, number> = {
  smooth: 0.25,
  erratic: 0.6,
  intermittent: 0.8,
  lumpy: 1.2,
  insufficient: 1,
};

export const REVIEW_PERIOD_DAYS = 7;

export type SimInput = {
  stock: number;
  daily: number; // 하루 평균 소모 (월 소모량 / 30)
  cv: number;
  LT90: number;
  arrivals: { qty: number; eta: string }[]; // 입고 예정 + (발주하면) 검토 수정안
  maintenance: { qty: number; date: string }[]; // 확정 필요량 F (앞으로 잡힌 정비만)
};

const sumOn = (items: { qty: number; at: string }[], from: string, to: string) =>
  items.filter((i) => i.at > from && i.at <= to).reduce((s, i) => s + i.qty, 0);

// d 일째 저녁 재고 (0일 = 기준일 현재)
export const medianPath = (input: SimInput, base: string, horizon: number) => {
  const arrivals = input.arrivals.map((a) => ({ qty: a.qty, at: a.eta }));
  const maint = input.maintenance.map((m) => ({ qty: m.qty, at: m.date }));
  const path: number[] = [];
  for (let d = 0; d <= horizon; d++) {
    const day = addDays(base, d);
    const qty =
      input.stock +
      sumOn(arrivals, addDays(base, -1), day) -
      input.daily * d -
      sumOn(maint, addDays(base, -1), day);
    path.push(Math.round(qty * 10) / 10);
  }
  return path;
};

// d 일째부터 다음 발주분이 들어올 때까지(늦을 때 납기 + 발주 주기) 수요가 가진 재고를 넘을 확률
export const stockoutProb = (input: SimInput, base: string, d: number, qtyAtD: number) => {
  const from = addDays(base, d);
  const to = addDays(from, input.LT90 + REVIEW_PERIOD_DAYS);
  const demand =
    input.daily * (input.LT90 + REVIEW_PERIOD_DAYS) +
    sumOn(
      input.maintenance.map((m) => ({ qty: m.qty, at: m.date })),
      from,
      to,
    );
  if (demand <= 0) return 0.01;
  const supply =
    Math.max(0, qtyAtD) +
    sumOn(
      input.arrivals.map((a) => ({ qty: a.qty, at: a.eta })),
      from,
      to,
    );
  const sd = Math.max(demand * input.cv, 0.5);
  const p = 1 - phi((supply - demand) / sd);
  return Math.round(Math.min(0.99, Math.max(0.01, p)) * 100) / 100;
};

// 처음으로 재고가 바닥나는 날 (1년 안에 없으면 null)
export const stockoutDate = (input: SimInput, base: string) => {
  if (input.daily <= 0 && input.maintenance.length === 0) return null;
  const path = medianPath(input, base, 365);
  const day = path.findIndex((q) => q <= 0);
  return day < 0 ? null : addDays(base, day);
};

// 앞으로 잡힌(끝나지 않은) 정비의 이 부품 필요량
export const maintenanceFor = (
  partId: string,
  list: { scheduled_on: string; parts: { part_id: string; qty: number }[]; completed?: boolean }[],
  base: string,
) =>
  list
    .filter((m) => !m.completed && m.scheduled_on >= base)
    .flatMap((m) =>
      m.parts
        .filter((p) => p.part_id === partId)
        .map((p) => ({ qty: p.qty, date: m.scheduled_on })),
    );
