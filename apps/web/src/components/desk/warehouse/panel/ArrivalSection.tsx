'use client';

import { ArrowRight, Truck } from 'lucide-react';
import Link from 'next/link';

import type { Part } from '@bjk/api/types/part';
import type { TwinArrival, TwinLayout, TwinProjection } from '@bjk/api/types/twin';

import { InfoSection } from '@/components/ui/InfoPanel';
import { useParts } from '@/hooks/part/useParts';
import { useWarehouseBridge } from '@/hooks/twin/useWarehouseBridge';
import { formatDate, formatQty } from '@/utils/format';
import { dayOf, locsByPart } from '@/utils/twin';

import type { BinSectionProps, OverviewSectionProps } from './types';

const ROW =
  'flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-bg-subtle disabled:hover:bg-transparent';

const LINK =
  'flex h-10 w-fit items-center gap-1 rounded-full bg-bg-subtle px-4 text-label-sm text-text-body transition-colors hover:bg-bg-brand-subtle hover:text-text-brand';

// 발주가 나가 도착을 기다리는 것만 — 'proposal'(발주하면)은 아직 결정 전이라 ③사장님 결정의 몫이다
const orderedByEta = (arrivals: TwinArrival[]) =>
  arrivals
    .filter((a) => a.kind === 'ordered')
    .sort((a, b) => a.eta.localeCompare(b.eta) || a.part_id.localeCompare(b.part_id));

const dayLabel = (base: string, eta: string) => {
  const d = dayOf(base, eta);
  return d <= 0 ? '오늘' : `${d}일 뒤`;
};

type ArrivalListProps = {
  arrivals: TwinArrival[];
  layout: TwinLayout;
  projection: TwinProjection;
  partOf: (id: string) => Part | undefined;
};

const ArrivalList = ({ arrivals, layout, projection, partOf }: ArrivalListProps) => {
  const bridge = useWarehouseBridge();
  const locsOf = locsByPart(layout.placements);
  return (
    <ul className="flex flex-col gap-1">
      {arrivals.map((a) => {
        const part = partOf(a.part_id);
        const loc = locsOf.get(a.part_id)?.[0];
        return (
          <li key={`${a.part_id}-${a.eta}`}>
            <button
              type="button"
              disabled={!loc}
              onClick={() => loc && bridge.goTo(loc)}
              className={ROW}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Truck size={16} aria-hidden className="shrink-0 text-icon-brand" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-label-md text-text-heading">
                    {part?.name ?? a.part_id}
                  </span>
                  <span className="text-label-sm text-text-secondary tabular-nums">
                    {formatQty(a.qty, part?.unit ?? '')}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="text-label-md text-text-heading tabular-nums">
                  {formatDate(a.eta)}
                </span>
                <span className="text-label-sm text-text-secondary">
                  {dayLabel(projection.base_date, a.eta)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const ReportLinks = () => (
  <div className="flex flex-wrap gap-2">
    <Link href="/reports" className={LINK}>
      발주 목록
      <ArrowRight size={14} aria-hidden />
    </Link>
    <Link href="/reports?tab=sim" className={LINK}>
      시뮬 리포트
      <ArrowRight size={14} aria-hidden />
    </Link>
  </div>
);

// ④발주·납기 — 고른 칸의 부품이 언제 얼마나 들어오는지 (W-11, 숫자는 /twin/projection 의 arrivals)
const ArrivalSection = ({ part, projection, layout }: BinSectionProps) => {
  const arrivals = orderedByEta(projection.arrivals.filter((a) => a.part_id === part.id));
  if (!arrivals.length) return null;
  return (
    <InfoSection title="입고 예정">
      <ArrivalList
        arrivals={arrivals}
        layout={layout}
        projection={projection}
        partOf={(id) => (id === part.id ? part : undefined)}
      />
      <ReportLinks />
    </InfoSection>
  );
};

// 아무것도 안 골랐을 때 — 도착 예정 전체
export const ArrivalOverviewSection = ({ projection, layout }: OverviewSectionProps) => {
  const parts = useParts({});
  const partMap = new Map((parts.data ?? []).map((p) => [p.id, p]));
  const arrivals = orderedByEta(projection.arrivals);
  return (
    <InfoSection title={`입고 예정 ${arrivals.length}건`}>
      {arrivals.length ? (
        <ArrivalList
          arrivals={arrivals}
          layout={layout}
          projection={projection}
          partOf={(id) => partMap.get(id)}
        />
      ) : (
        <p className="text-body-sm text-text-secondary">도착을 기다리는 발주가 없어요.</p>
      )}
      <ReportLinks />
    </InfoSection>
  );
};

export default ArrivalSection;
