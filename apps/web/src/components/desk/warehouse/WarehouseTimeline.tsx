'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { TwinProjection } from '@bjk/api/types/twin';

import ComputedAt from '@/components/ui/ComputedAt';
import Segmented from '@/components/ui/Segmented';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { addDays, shortDate } from '@/utils/twin';

type WarehouseTimelineProps = {
  projection: TwinProjection;
};

const TICK_MS = 350;
const TICK_COUNT = 5;

const weekday = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'UTC',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

const ORDER_OPTIONS = [
  ['no', '발주 안 하면'],
  ['yes', '발주하면'],
] as const;

// 날짜 슬라이더 — TwinBin.qty 가 날짜별 배열이라 값은 그 인덱스(0 ~ horizon_days)다. 계산은 하지 않는다
const WarehouseTimeline = ({ projection }: WarehouseTimelineProps) => {
  const day = useWarehouseStore((s) => s.day);
  const setDay = useWarehouseStore((s) => s.setDay);
  const withOrders = useWarehouseStore((s) => s.withOrders);
  const setWithOrders = useWarehouseStore((s) => s.setWithOrders);
  const [playing, setPlaying] = useState(false);

  const horizon = projection.horizon_days;
  const base = projection.base_date;
  const running = playing && day < horizon;
  const date = addDays(base, day);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const next = Math.min(horizon, useWarehouseStore.getState().day + 1);
      setDay(next);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [running, horizon, setDay]);

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) =>
    Math.round((horizon * i) / (TICK_COUNT - 1)),
  );

  return (
    <div className="flex items-center gap-5 rounded-xl bg-bg-surface p-4 shadow-card">
      <button
        type="button"
        onClick={() => {
          if (running) return setPlaying(false);
          if (day >= horizon) setDay(0);
          setPlaying(true);
        }}
        aria-label={running ? '멈추기' : '날짜를 앞으로 재생'}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-bg-brand text-text-on-brand transition-colors hover:bg-bg-brand-hover"
      >
        {running ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
      </button>
      <div className="flex w-40 shrink-0 flex-col">
        <span className="text-label-lg text-text-heading">
          {weekday.format(new Date(`${date}T00:00:00Z`))}
        </span>
        {day === 0 ? (
          <ComputedAt at={projection.computed_at} />
        ) : (
          <span className="text-label-sm text-text-secondary">예측 (중앙값 경로)</span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input
          type="range"
          min={0}
          max={horizon}
          value={Math.min(day, horizon)}
          onChange={(e) => {
            setPlaying(false);
            setDay(Number(e.target.value));
          }}
          aria-label="예측 날짜"
          aria-valuetext={`${shortDate(date)}${day === 0 ? ' 오늘' : `, ${day}일 뒤`}`}
          className="w-full accent-bg-inverse"
        />
        <div aria-hidden className="flex justify-between text-label-sm text-text-secondary">
          {ticks.map((d) => (
            <span key={d}>
              {shortDate(addDays(base, d))}
              {d === 0 ? ' 오늘' : ''}
            </span>
          ))}
        </div>
      </div>
      <Segmented
        label="예측 기준"
        options={ORDER_OPTIONS}
        value={withOrders ? 'yes' : 'no'}
        onChange={(v) => setWithOrders(v === 'yes')}
      />
    </div>
  );
};

export default WarehouseTimeline;
