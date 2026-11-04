'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

import type { StockForecast } from '@bjk/api/types/forecast';

import { formatDate, formatNumber, formatQty } from '@/utils/format';
import { TD, TH, TR } from '@/components/ui/table';

// 시리즈 색 — 색은 "시나리오"(발주 / 미발주), 선 모양은 "실적 / 예측"을 구분한다.
// brand-600 · sub-700 쌍은 dataviz 팔레트 검사(명도 대역, 채도 하한, 색각 이상 ΔE, 표면 대비)를 모두 통과했다.
// 상태색(빨강·주황)은 상태 표시 전용이라 시리즈에 쓰지 않는다.
// 디자인 토큰에 차트용 시맨틱 토큰이 없어 프리미티브를 데이터 표시(일러스트 성격)에 한해 쓴다.
const SERIES = {
  actual: { label: '실적', color: 'var(--color-brand-600)', dash: undefined },
  withOrder: { label: '발주 시 예측', color: 'var(--color-brand-600)', dash: '6 4' },
  withoutOrder: { label: '미발주 시 예측', color: 'var(--color-sub-700)', dash: '6 4' },
} as const;
type SeriesKey = keyof typeof SERIES;

// 축·격자·기준선은 한 단계 옅은 실선 (점선은 "예측"으로 읽히므로 데이터 선에만 쓴다)
const AXIS = 'var(--border-default)';
const REFERENCE = 'var(--border-strong)';
const MUTED_TEXT = 'var(--text-secondary)';

type Row = { date: string } & Partial<Record<SeriesKey, number>>;

const toRows = (forecast: StockForecast): Row[] => {
  const rows = new Map<string, Row>();
  const put = (key: SeriesKey, points: StockForecast['actual'] | null) =>
    points?.forEach(({ date, qty }) =>
      rows.set(date, { ...(rows.get(date) ?? { date }), [key]: qty }),
    );
  put('actual', forecast.actual);
  put('withOrder', forecast.with_order);
  put('withoutOrder', forecast.without_order);
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
};

const shortDate = (ymd: string) => {
  const [, m, d] = ymd.split('-').map(Number);
  return `${m}/${d}`;
};

const LineKey = ({ color, dash }: { color: string; dash?: string }) => (
  <svg width="20" height="8" aria-hidden className="shrink-0">
    <line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dash} />
  </svg>
);

// 값이 먼저, 시리즈 이름은 뒤에 (dataviz: values lead, labels follow)
const ChartTooltip = ({ active, payload, label, unit }: TooltipContentProps & { unit: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="flex flex-col gap-1 rounded-md bg-bg-surface px-3 py-2 shadow-raised">
      <span className="text-label-sm text-text-secondary">{formatDate(String(label))}</span>
      {payload.map((entry) => {
        const series = SERIES[entry.dataKey as SeriesKey];
        return (
          <span key={String(entry.dataKey)} className="flex items-center gap-2">
            <LineKey color={series.color} dash={series.dash} />
            <span className="text-label-md text-text-heading tabular-nums">
              {formatQty(Number(entry.value), unit)}
            </span>
            <span className="text-label-sm text-text-secondary">{series.label}</span>
          </span>
        );
      })}
    </div>
  );
};

type StockForecastChartProps = {
  forecast: StockForecast;
};

// 재고 추이 + 예측선 (W-03, W-05). 한 축(수량)만 쓴다.
const StockForecastChart = ({ forecast }: StockForecastChartProps) => {
  const rows = toRows(forecast);
  const shown = (Object.keys(SERIES) as SeriesKey[]).filter((key) =>
    rows.some((row) => row[key] !== undefined),
  );
  const hasForecast = shown.length > 1;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="범례">
        {shown.map((key) => (
          <li key={key} className="flex items-center gap-2 text-label-sm text-text-body">
            <LineKey color={SERIES[key].color} dash={SERIES[key].dash} />
            {SERIES[key].label}
            {key === 'withOrder' && forecast.order_qty
              ? ` (${formatQty(forecast.order_qty, forecast.unit)} 발주)`
              : null}
          </li>
        ))}
      </ul>

      <div className="h-72 w-full text-label-sm tabular-nums">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={AXIS} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              stroke={AXIS}
              tick={{ fill: MUTED_TEXT, fontSize: 12 }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              stroke={AXIS}
              tick={{ fill: MUTED_TEXT, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: REFERENCE, strokeWidth: 1 }}
              content={(props) => <ChartTooltip {...props} unit={forecast.unit} />}
            />
            {forecast.reorder_point !== null ? (
              <ReferenceLine
                y={forecast.reorder_point}
                stroke={REFERENCE}
                label={{
                  value: `재주문점 ${forecast.reorder_point}`,
                  position: 'insideTopRight',
                  fill: MUTED_TEXT,
                  fontSize: 12,
                }}
              />
            ) : null}
            <ReferenceLine
              x={forecast.today}
              stroke={REFERENCE}
              label={{ value: '오늘', position: 'insideTopLeft', fill: MUTED_TEXT, fontSize: 12 }}
            />
            {forecast.deadline && forecast.deadline >= rows[0]?.date ? (
              <ReferenceLine
                x={forecast.deadline}
                stroke={REFERENCE}
                label={{
                  value: '발주 마감',
                  position: 'insideTopLeft',
                  fill: MUTED_TEXT,
                  fontSize: 12,
                }}
              />
            ) : null}
            {shown.map((key) => (
              <Line
                key={key}
                dataKey={key}
                name={SERIES[key].label}
                type="linear"
                stroke={SERIES[key].color}
                strokeWidth={2}
                strokeDasharray={SERIES[key].dash}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: SERIES[key].color,
                  stroke: 'var(--bg-surface)',
                  strokeWidth: 2,
                }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!hasForecast ? (
        <p className="text-body-sm text-text-secondary">
          예측 근거(소진 예상일·월 소모량)가 아직 없어 실적만 보여줘요.
        </p>
      ) : null}

      {/* 툴팁 없이도 모든 값을 읽을 수 있게 표를 함께 둔다 (dataviz: table view) */}
      <details className="text-body-sm">
        <summary className="flex h-11 cursor-pointer items-center text-label-md text-text-brand">
          표로 보기
        </summary>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full tabular-nums">
            <thead className="sticky top-0">
              <tr>
                <th scope="col" className={`${TH} text-left`}>
                  날짜
                </th>
                {shown.map((key) => (
                  <th key={key} scope="col" className={`${TH} text-right`}>
                    {SERIES[key].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date} className={TR}>
                  <td className={`${TD} text-text-secondary`}>{formatDate(row.date)}</td>
                  {shown.map((key) => (
                    <td key={key} className={`${TD} text-right text-text-body`}>
                      {row[key] === undefined ? '—' : formatNumber(row[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

export default StockForecastChart;
