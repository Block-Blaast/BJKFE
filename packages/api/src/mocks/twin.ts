// 디지털 트윈(W-11) 목업 — 배치는 가상 공장(fixtures/factory.ts), 예측은 fixtures/simulate.ts 의 중앙값 경로.
// 부품 지표·검토 의견서와 같은 계산이라 3D 의 날짜·상태가 다른 화면과 어긋나지 않는다.
import { delay, http, HttpResponse } from 'msw';

import { ENDPOINTS } from '../endpoints';
import type { AuditItem } from '../types/audit';
import type { Part } from '../types/part';
import type { Review } from '../types/review';
import type { Maintenance } from '../types/setup';
import type {
  TwinArrival,
  TwinBin,
  TwinBinStatus,
  TwinEquipmentProjection,
  TwinLayout,
  TwinProjection,
} from '../types/twin';
import {
  BASE_DATE,
  COMPUTED_AT,
  EQUIPMENT_FIXTURES,
  FLOOR,
  RACKS,
  ZONES,
  formatLocation,
} from './fixtures/factory';
import { PART_FIXTURES } from './fixtures/parts';
import {
  PATTERN_CV,
  addDays,
  maintenanceFor,
  medianPath,
  stockoutProb,
  type SimInput,
} from './fixtures/simulate';

const NETWORK_DELAY = 400;
const HORIZON_DAYS = 56; // 8주
const RISK_P_OUT = 0.3; // 기존 판정과 같은 기준 (결품 확률 30% 이상 = 빨강)

// 보관 위치 문자열을 칸 좌표로 되돌린다. 서버는 위치를 구조화해서 갖고 있을 것이라 목업에서만 필요하다.
const placements = PART_FIXTURES.flatMap((p) => {
  for (const rack of RACKS) {
    for (let level = 1; level <= rack.levels; level++) {
      for (let slot = 1; slot <= rack.slots; slot++) {
        if (formatLocation(rack.id, level, slot) === p.location) {
          return [{ part_id: p.part_id, rack_id: rack.id, level, slot }];
        }
      }
    }
  }
  return [];
});

const layout: TwinLayout = {
  size: FLOOR,
  zones: ZONES.map((z) => ({ ...z })),
  racks: RACKS,
  equipment: EQUIPMENT_FIXTURES.map((e) => ({
    id: e.id,
    name: e.name,
    kind: e.kind,
    x: e.x,
    z: e.z,
    part_ids: e.parts.map((p) => p.part_id),
  })),
  placements,
};

const normalizeSpec = (spec: string | null) =>
  spec?.toLowerCase().replace(/×/g, 'x').replace(/\s/g, '') ?? null;

export type TwinSource = {
  parts: () => Part[]; // 병합 반영된 현재 부품 (partView)
  reviews: () => Review[];
  audits: () => AuditItem[];
  maintenance: () => Maintenance[];
};

const project = (src: TwinSource, withOrders: boolean): TwinProjection => {
  const base = BASE_DATE;
  const parts = src.parts();
  const byId = new Map(parts.map((p) => [p.id, p]));

  const arrivals: TwinArrival[] = parts.flatMap((p) =>
    p.incoming && p.incoming.eta >= base
      ? [
          {
            part_id: p.id,
            qty: p.incoming.qty,
            eta: p.incoming.eta,
            kind: 'ordered' as const,
            review_id: null,
          },
        ]
      : [],
  );
  if (withOrders) {
    for (const r of src.reviews()) {
      const part = byId.get(r.part.id);
      if (r.status !== '검토완료' || !part || r.proposal.qty <= 0) continue;
      arrivals.push({
        part_id: part.id,
        qty: r.proposal.qty,
        eta: addDays(base, part.metrics.LT50 ?? 3),
        kind: 'proposal',
        review_id: r.id,
      });
    }
  }

  const maintenance = src.maintenance().map((m) => ({
    scheduled_on: m.scheduled_on,
    completed: m.completed_at !== null,
    equipment: m.equipment.name,
    parts: m.parts.map((p) => ({ part_id: p.part_id, qty: p.qty })),
  }));
  const openAudits = new Map(
    src
      .audits()
      .filter((a) => a.status !== 'resolved')
      .map((a) => [a.part.id, { id: a.id, reason: a.reason, grade: a.grade }]),
  );

  const bins: TwinBin[] = parts.map((p) => {
    const daily = (p.metrics.m ?? 0) / 30;
    const need = maintenanceFor(p.id, maintenance, base);
    const input: SimInput = {
      stock: p.stock,
      daily,
      cv: PATTERN_CV[p.metrics.demand_pattern ?? 'insufficient'],
      LT90: p.metrics.LT90 ?? 7,
      arrivals: arrivals.filter((a) => a.part_id === p.id),
      maintenance: need,
    };
    const path = medianPath(input, base, HORIZON_DAYS);
    const consumes = daily > 0 || need.length > 0;
    const pOut = path.map((q, d) => (consumes ? stockoutProb(input, base, d, q) : 0));
    const reorder = p.metrics.reorder_point;
    const status = path.map((q, d): TwinBinStatus => {
      if (consumes && q <= 0) return 'out';
      if (pOut[d] >= RISK_P_OUT) return 'risk';
      if (reorder !== null && q <= reorder) return 'low';
      return 'normal';
    });
    return {
      part_id: p.id,
      reorder_point: reorder,
      qty: path.map((q) => Math.max(0, q)),
      status,
      p_out: pOut,
      same_spec_group: p.hidden_stock > 0 ? normalizeSpec(p.spec) : null,
      audit: openAudits.get(p.id) ?? null,
      maintenance: maintenance
        .filter((m) => !m.completed && m.scheduled_on >= base)
        .flatMap((m) =>
          m.parts
            .filter((x) => x.part_id === p.id)
            .map((x) => ({ date: m.scheduled_on, qty: x.qty, equipment: m.equipment })),
        ),
    };
  });
  const binOf = new Map(bins.map((b) => [b.part_id, b]));

  const equipment: TwinEquipmentProjection[] = EQUIPMENT_FIXTURES.map((e) => {
    const days = Array.from({ length: HORIZON_DAYS + 1 }, (_, d) => {
      const used = e.parts.map((x) => binOf.get(x.part_id)).filter((b) => b !== undefined);
      const out = used.filter((b) => b.status[d] === 'out');
      const risk = used.filter((b) => b.status[d] === 'risk');
      // 결품 시 손실 L (F-ANAL-08): 시간당 손실 × 가동 시간 × 보통 납기(긴급 발주로 다시 받을 때까지)
      const lead = Math.max(...out.map((b) => byId.get(b.part_id)?.metrics.LT50 ?? 3), 0);
      return {
        status: out.length
          ? ('down' as const)
          : risk.length
            ? ('warn' as const)
            : ('normal' as const),
        loss:
          out.length && e.hourly_loss && e.daily_hours
            ? e.hourly_loss * e.daily_hours * lead
            : null,
        causes: (out.length ? out : risk).map((b) => b.part_id),
      };
    });
    return {
      equipment_id: e.id,
      status: days.map((x) => x.status),
      loss: days.map((x) => x.loss),
      cause_part_ids: days.map((x) => x.causes),
    };
  });

  return {
    base_date: base,
    horizon_days: HORIZON_DAYS,
    with_orders: withOrders,
    computed_at: COMPUTED_AT,
    is_mock: true,
    bins,
    equipment,
    arrivals,
  };
};

export const createTwinHandlers = (src: TwinSource) => [
  http.get(ENDPOINTS.twinLayout, async () => {
    await delay(NETWORK_DELAY);
    return HttpResponse.json(layout);
  }),

  http.get(ENDPOINTS.twinProjection, async ({ request }) => {
    await delay(NETWORK_DELAY);
    const withOrders = new URL(request.url).searchParams.get('with_orders') === 'true';
    return HttpResponse.json(project(src, withOrders));
  }),
];
