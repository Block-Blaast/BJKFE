'use client';

import { Pause, Play, Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import type { Part } from '@bjk/api/types/part';
import type { TwinBin, TwinProjection } from '@bjk/api/types/twin';

import ErrorState from '@/components/ui/ErrorState';
import InfoPanel, { DotTag, InfoSection } from '@/components/ui/InfoPanel';
import Segmented from '@/components/ui/Segmented';
import { PILL_SEARCH } from '@/components/ui/controls';
import { TABLE, TABLE_CARD, TD, TH, TR } from '@/components/ui/table';
import { useParts } from '@/hooks/part/useParts';
import { useRecordReceipt } from '@/hooks/twin/useRecordReceipt';
import { useTwinLayout, useTwinProjection } from '@/hooks/twin/useTwinLayout';
import { formatComputedAt, formatQty, formatWon } from '@/utils/format';
import {
  BIN_LOOK_LABEL,
  LOOK_ORDER,
  LOOK_TONE,
  TWIN_LAYERS,
  addDays,
  binLook,
  dayOf,
  normalizeSearch,
  shortDate,
  type BinLook,
  type TwinLayerKey,
  type TwinLayers,
} from '@/utils/twin';

import { BinPanel, EquipmentPanel } from './TwinPanel';
import {
  binPosition,
  type CameraFocus,
  type LabelAnchors,
  type SceneBin,
  type SceneCrate,
  type SceneEquipment,
  type SceneLink,
} from './WarehouseScene';

// three.js 는 이 화면에서만 불러온다 (WebGL 이라 서버에서 그리지 않는다)
const WarehouseScene = dynamic(() => import('./WarehouseScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-body-md text-text-secondary">
      3D 창고를 그리는 중이에요…
    </div>
  ),
});

const OVERVIEW: CameraFocus = { x: -1, z: 1.5, distance: 23, spin: true };
const TOP_VIEW: CameraFocus = { x: -0.5, z: 0.5, distance: 22, top: true };

// 시연 장면 — 발표 순서대로 누르면 이야기가 이어진다. 문장 속 숫자는 목업 데이터(가상 공장) 기준이다.
const STEPS = [
  {
    title: '전체 보기',
    text: '빨간 칸은 결품 위험, 주황은 재주문점 이하예요. 볼베어링 6205ZZ는 3개뿐인데 11/20 CNC 선반 1호기 정비에 4개가 필요해서, 빨간 선이 1호기로 이어져요. 깜빡이는 검은 칸은 장부가 의심스러운 칸이에요.',
    state: { day: 0, withOrders: false, query: '' },
    focus: OVERVIEW,
  },
  {
    title: '숨은 재고',
    text: '“M8×20”을 찾으면 C선반 1단의 육각볼트(40개)와 맨 위 칸의 헥사볼트(800개)가 함께 빛나요. 같은 규격인데 이름이 달라 따로 등록된 재고예요. 볼트를 더 살 필요가 없어요.',
    state: { day: 0, withOrders: false, query: 'M8×20' },
    focus: { x: -7, z: 4, distance: 11 },
  },
  {
    title: '11/20로 당기기',
    text: '날짜를 정비일로 옮기면 6205ZZ 칸이 비고 CNC 선반 1호기가 멈춰요. 인서트·엔드밀도 바닥나 2호기와 머시닝센터까지 멈춰요. 예상 손실은 시간당 손실 × 가동 시간 × 보통 납기예요.',
    state: { day: 15, withOrders: false, query: '' },
    focus: { x: 0, z: -0.5, distance: 18 },
  },
  {
    title: '발주하면',
    text: '“발주하면”으로 바꾸면 결정 대기 검토의 수정안이 예측에 들어가요. 수정안 상자는 납기에 맞춰 선반에 들어가고, 11/20의 CNC 선반들이 다시 가동돼요. 그래도 남는 위험은 아직 검토가 없는 부품이에요.',
    state: { day: 15, withOrders: true, query: '' },
    focus: { x: -1.5, z: 2.5, distance: 19 },
  },
  {
    title: '입고',
    text: '작업자가 채팅으로 “V벨트 A-42 10개 들어왔어요”를 기록하면 도크의 상자가 선반으로 들어가요. 원장에 입고가 남고, 부품·대시보드 화면의 재고도 함께 바뀌어요.',
    state: { day: 0, withOrders: false, query: '' },
    focus: { x: -6, z: 1.5, distance: 17 },
  },
] as const;

const RECEIPT = { partId: 'pt-vbelt-a42', text: 'V벨트 A-42 10개 들어왔어요' } as const;
const isReceiptCrate = (a: { part_id: string; kind: string }) =>
  a.part_id === RECEIPT.partId && a.kind === 'ordered';
const TICK_MS = 350;
const ALL_LAYERS: TwinLayers = {
  status: true,
  hidden: true,
  suspect: true,
  impact: true,
  dock: true,
};

type Selection = { type: 'bin' | 'equipment'; id: string } | null;

const weekday = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'UTC',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

// 디지털 트윈 — 3D 창고 (W-11, 명세서에 없는 화면).
// 3D 는 계산하지 않는다: 색·숫자·날짜별 상태는 모두 /twin/projection(서버 경로 시뮬레이션의 중앙값)에서 온다.
// TODO(W-11): SSE(stock.changed, audit.flagged)로 twin 쿼리 무효화 — 지금은 같은 탭의 기록·결정만 바로 반영된다
const WarehouseView = () => {
  const layout = useTwinLayout();
  const noOrder = useTwinProjection(false);
  const withOrder = useTwinProjection(true);
  const parts = useParts({});
  const receipt = useRecordReceipt();

  const [day, setDay] = useState(0);
  const [withOrders, setWithOrders] = useState(false);
  const [layers, setLayers] = useState<TwinLayers>(ALL_LAYERS);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Selection>(null);
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState<CameraFocus>(OVERVIEW);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<'3d' | 'table'>('3d');
  const [receiving, setReceiving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const anchors: LabelAnchors = useRef(new Map());

  const projection = withOrders ? withOrder : noOrder;
  const horizon = projection.data?.horizon_days ?? 56;
  const running = playing && day < horizon;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setDay((d) => Math.min(horizon, d + 1)), TICK_MS);
    return () => clearInterval(timer);
  }, [running, horizon]);

  if (layout.isError || projection.isError || parts.isError) {
    return (
      <ErrorState
        title="3D 창고를 불러오지 못했어요"
        onRetry={() => {
          void layout.refetch();
          void projection.refetch();
          void parts.refetch();
        }}
      />
    );
  }
  if (layout.isPending || projection.isPending || parts.isPending) {
    return <p className="text-body-md text-text-secondary">창고를 불러오는 중이에요…</p>;
  }

  const data: TwinProjection = projection.data;
  const base = data.base_date;
  const partOf = new Map(parts.data.map((p) => [p.id, p]));
  const binOf = new Map(data.bins.map((b) => [b.part_id, b]));
  const racks = new Map(layout.data.racks.map((r) => [r.id, r]));
  const positionOf = new Map(
    layout.data.placements.flatMap((pl) => {
      const rack = racks.get(pl.rack_id);
      return rack ? [[pl.part_id, binPosition(rack, pl.level, pl.slot)] as const] : [];
    }),
  );
  const partName = (id: string) => partOf.get(id)?.name ?? id;

  // 검색어 → 맞는 부품과 그 같은 규격 묶음을 함께 강조
  const q = normalizeSearch(query);
  const matched = q
    ? data.bins.filter((b) => {
        const p = partOf.get(b.part_id);
        return p && normalizeSearch(`${p.name}${p.spec ?? ''}`).includes(q);
      })
    : [];
  const groups = new Set(matched.map((b) => b.same_spec_group).filter((g) => g !== null));
  const highlighted = new Set(
    data.bins
      .filter((b) => matched.includes(b) || (b.same_spec_group && groups.has(b.same_spec_group)))
      .map((b) => b.part_id),
  );

  const lookOf = (b: TwinBin) => binLook(b, day, layers);
  const heightOf = (b: TwinBin) => {
    const qty = b.qty[day];
    const ratio = b.reorder_point ? qty / b.reorder_point : qty > 0 ? 1.6 : 0;
    return Math.min(1, 0.15 + 0.4 * Math.min(ratio, 2));
  };

  const sceneBins: SceneBin[] = data.bins.flatMap((b) => {
    const position = positionOf.get(b.part_id);
    if (!position) return [];
    return [
      {
        id: b.part_id,
        position,
        height: heightOf(b),
        look: lookOf(b),
        hidden: layers.hidden && b.same_spec_group !== null && (!q || highlighted.has(b.part_id)),
        dimmed: !!q && !highlighted.has(b.part_id),
        beam: !!q && highlighted.has(b.part_id),
        selected: selected?.type === 'bin' && selected.id === b.part_id,
      },
    ];
  });

  const equipmentOf = new Map(data.equipment.map((e) => [e.equipment_id, e]));
  const sceneEquipment: SceneEquipment[] = layout.data.equipment.map((e) => ({
    id: e.id,
    x: e.x,
    z: e.z,
    kind: e.kind,
    down: layers.impact && equipmentOf.get(e.id)?.status[day] === 'down',
    selected: selected?.type === 'equipment' && selected.id === e.id,
  }));

  const links: SceneLink[] = layers.impact
    ? layout.data.equipment.flatMap((e) => {
        const ep = equipmentOf.get(e.id);
        if (!ep || ep.status[day] === 'normal') return [];
        return ep.cause_part_ids[day].flatMap((pid) => {
          const from = positionOf.get(pid);
          return from
            ? [
                {
                  id: `${e.id}-${pid}`,
                  from,
                  to: [e.x, 0, e.z] as const,
                  severe: binOf.get(pid)?.status[day] === 'out',
                },
              ]
            : [];
        });
      })
    : [];

  // 받은 상자가 선반에 닿으면 실제로 채팅 입고를 기록한다
  const finishReceipt = () => {
    receipt.mutate(
      { text: RECEIPT.text },
      {
        onSuccess: (turn) => {
          setNotice(turn.reply);
          setSelected({ type: 'bin', id: RECEIPT.partId });
        },
        onError: () => setNotice('입고를 기록하지 못했어요. 다시 시도해 주세요.'),
        onSettled: () => setReceiving(false),
      },
    );
  };

  const dock = layout.data.zones.find((z) => z.kind === 'dock');
  // 입고 장면의 상자는 층·날짜와 상관없이 남긴다 — 도중에 사라지면 onLanded 가 불리지 않아 장면이 멈춘다
  const waiting = data.arrivals.filter(
    (a) => (layers.dock && day < dayOf(base, a.eta)) || (receiving && isReceiptCrate(a)),
  );
  const crates: (SceneCrate & { label: string; note: string })[] = dock
    ? waiting.map((a, i) => {
        const part = partOf.get(a.part_id);
        const flying = receiving && isReceiptCrate(a);
        const target = positionOf.get(a.part_id);
        return {
          id: `${a.part_id}-${a.kind}`,
          position: [dock.x - dock.width / 2 + 0.7 + (i % 5) * 1.15, 0.3, dock.z] as const,
          flyTo: flying && target ? ([target[0], target[1] + 0.3, target[2]] as const) : null,
          onLanded: flying ? () => finishReceipt() : undefined,
          label: `${part?.name ?? a.part_id} ${a.qty}${part?.unit ?? ''}`,
          note: `${a.kind === 'ordered' ? '발주됨' : '주문 대기'} · ${shortDate(a.eta)} 도착 예정`,
        };
      })
    : [];

  const goStep = (index: number) => {
    const s = STEPS[index];
    setStep(index);
    setPlaying(false);
    setSelected(null);
    setNotice(null);
    setDay(s.state.day);
    setWithOrders(s.state.withOrders);
    setQuery(s.state.query);
    setLayers(ALL_LAYERS);
    setFocus({ ...s.focus });
    if (index === 4) {
      // 상자가 실제로 날아갈 수 있을 때만 시작한다 (도크·선반 위치가 없으면 착지하지 못한다)
      const ordered = noOrder.data?.arrivals.some(isReceiptCrate);
      if (ordered && dock && positionOf.has(RECEIPT.partId)) setReceiving(true);
      else setNotice('도크에 기다리는 V벨트 상자가 없어요. 이미 입고했어요.');
    }
  };

  const focusOn = (partId: string) => {
    const pos = positionOf.get(partId);
    if (pos) setFocus({ x: pos[0], z: pos[2], distance: 11 });
    setSelected({ type: 'bin', id: partId });
  };

  const watch = data.bins
    .map((b) => ({ b, look: lookOf(b) }))
    .filter(({ look }) => look !== 'normal')
    .sort((a, b) => LOOK_ORDER[a.look] - LOOK_ORDER[b.look]);

  const selectedBin = selected?.type === 'bin' ? binOf.get(selected.id) : undefined;
  const selectedPart = selectedBin ? partOf.get(selectedBin.part_id) : undefined;
  const selectedEquipment =
    selected?.type === 'equipment'
      ? layout.data.equipment.find((e) => e.id === selected.id)
      : undefined;
  const date = addDays(base, day);

  // ---- 3D 위에 띄우는 라벨 (바깥 DOM — 위치만 장면이 정한다) ----
  const anchor =
    (id: string, pos: readonly [number, number, number]) => (el: HTMLElement | null) => {
      if (el) anchors.current.set(id, { el, pos });
      else anchors.current.delete(id);
    };
  const labels = [
    ...layout.data.equipment.map((e) => {
      const ep = equipmentOf.get(e.id);
      const status = layers.impact ? (ep?.status[day] ?? 'normal') : 'normal';
      const loss = ep?.loss[day];
      return (
        <div
          key={`eq-${e.id}`}
          ref={anchor(`eq-${e.id}`, [e.x, 2.9, e.z])}
          className={`absolute top-0 left-0 rounded-full px-3 py-1 text-label-sm whitespace-nowrap shadow-card ${
            status === 'down'
              ? 'bg-bg-danger-subtle text-text-danger ring-2 ring-border-danger'
              : status === 'warn'
                ? 'bg-bg-warning-subtle text-text-warning'
                : 'bg-bg-surface text-text-heading'
          }`}
        >
          {status === 'down'
            ? `${e.name} 정지 예상${loss ? ` · 손실 ${formatWon(loss)} (추정)` : ''}`
            : status === 'warn'
              ? `${e.name} 위험`
              : e.name}
        </div>
      );
    }),
    ...sceneBins
      .filter(
        (b) =>
          b.selected ||
          highlighted.has(b.id) ||
          (layers.status && (b.look === 'out' || b.look === 'risk')),
      )
      .map((b) => {
        const part = partOf.get(b.id);
        const qty = binOf.get(b.id)?.qty[day] ?? 0;
        return (
          <div
            key={`bin-${b.id}`}
            ref={anchor(`bin-${b.id}`, [b.position[0], b.position[1] + 0.75, b.position[2]])}
            className={`absolute top-0 left-0 rounded-md bg-bg-surface px-2 py-1 text-label-sm whitespace-nowrap shadow-card ${
              highlighted.has(b.id)
                ? 'text-text-brand ring-1 ring-border-brand'
                : 'text-text-heading'
            }`}
          >
            {part?.name} {formatQty(Math.round(qty * 10) / 10, part?.unit ?? '')}
          </div>
        );
      }),
    ...crates.map((c) => (
      <div
        key={`crate-${c.id}`}
        ref={anchor(`crate-${c.id}`, [c.position[0], 1, c.position[2]])}
        className="absolute top-0 left-0 flex flex-col rounded-md bg-bg-surface px-2 py-1 whitespace-nowrap shadow-card"
      >
        <span className="text-label-sm text-text-heading">{c.label}</span>
        <span className="text-label-sm text-text-secondary">{c.note}</span>
      </div>
    )),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="시연 장면" className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-pressed={step === i}
              onClick={() => goStep(i)}
              disabled={receiving}
              className={`flex h-10 items-center gap-2 rounded-full pr-4 pl-1 text-label-md transition-colors ${
                step === i
                  ? 'bg-bg-inverse text-text-on-inverse'
                  : 'bg-bg-surface text-text-body shadow-card hover:bg-bg-subtle'
              }`}
            >
              <span
                className={`flex size-8 items-center justify-center rounded-full text-label-sm ${
                  step === i ? 'bg-bg-sub text-gray-900' : 'bg-bg-subtle text-text-secondary'
                }`}
              >
                {i + 1}
              </span>
              {s.title}
            </button>
          ))}
        </div>
        <div role="search" className="relative ml-auto">
          <label htmlFor="twin-search" className="sr-only">
            이름·규격으로 칸 찾기
          </label>
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-text-secondary"
          />
          <input
            id="twin-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·규격 (예: M8×20)"
            className={`${PILL_SEARCH} w-64 pl-12`}
          />
        </div>
        <Segmented
          label="보기 방식"
          options={[
            ['3d', '3D'],
            ['table', '표'],
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      <div className="grid grid-cols-3 items-start gap-5">
        <div className="col-span-2">
          {view === '3d' ? (
            <div className="relative h-160 overflow-hidden rounded-xl bg-bg-surface shadow-card">
              <WarehouseScene
                layout={layout.data}
                bins={sceneBins}
                equipment={sceneEquipment}
                links={links}
                crates={crates}
                focus={focus}
                anchors={anchors}
                onSelectBin={(id) => setSelected({ type: 'bin', id })}
                onSelectEquipment={(id) => setSelected({ type: 'equipment', id })}
                onClear={() => setSelected(null)}
              />
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                {labels}
              </div>
              <div role="group" aria-label="카메라" className="absolute top-4 right-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFocus({ ...OVERVIEW })}
                  className="h-9 rounded-full bg-bg-surface px-4 text-label-sm text-text-body shadow-card transition-colors hover:bg-bg-subtle"
                >
                  전체 보기
                </button>
                <button
                  type="button"
                  aria-pressed={!!focus.top}
                  onClick={() => setFocus(focus.top ? { ...OVERVIEW } : { ...TOP_VIEW })}
                  className={`h-9 rounded-full px-4 text-label-sm shadow-card transition-colors ${
                    focus.top
                      ? 'bg-bg-inverse text-text-on-inverse'
                      : 'bg-bg-surface text-text-body hover:bg-bg-subtle'
                  }`}
                >
                  위에서 보기
                </button>
              </div>
            </div>
          ) : (
            <TwinTable
              bins={[...data.bins].sort((a, b) => LOOK_ORDER[lookOf(a)] - LOOK_ORDER[lookOf(b)])}
              day={day}
              lookOf={lookOf}
              partOf={partOf}
              onSelect={focusOn}
            />
          )}
          <div role="group" aria-label="표시 층" className="mt-3 flex flex-wrap items-center gap-2">
            {TWIN_LAYERS.map(({ key, label }) => (
              <LayerToggle
                key={key}
                layer={key}
                label={label}
                on={layers[key]}
                onToggle={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
              />
            ))}
            <span className="text-label-sm text-text-secondary">눌러서 층을 켜고 꺼요</span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {notice ? (
            <p
              role="status"
              className="rounded-xl bg-bg-brand-subtle px-5 py-4 text-label-md text-text-brand"
            >
              {notice}
            </p>
          ) : null}
          {selectedBin && selectedPart ? (
            <BinPanel
              part={selectedPart}
              bin={selectedBin}
              look={lookOf(selectedBin)}
              day={day}
              equipmentNames={layout.data.equipment
                .filter((e) => e.part_ids.includes(selectedPart.id))
                .map((e) => e.name)}
              arrivals={data.arrivals.filter((a) => a.part_id === selectedPart.id)}
              sameSpec={data.bins
                .filter(
                  (b) =>
                    b.part_id !== selectedBin.part_id &&
                    b.same_spec_group !== null &&
                    b.same_spec_group === selectedBin.same_spec_group,
                )
                .flatMap((b) => {
                  const p = partOf.get(b.part_id);
                  return p ? [{ part: p, qty: b.qty[day] }] : [];
                })}
              onClose={() => setSelected(null)}
            />
          ) : selectedEquipment && equipmentOf.get(selectedEquipment.id) ? (
            <EquipmentPanel
              name={selectedEquipment.name}
              projection={equipmentOf.get(selectedEquipment.id)!}
              day={day}
              partName={partName}
              usedParts={selectedEquipment.part_ids}
              onClose={() => setSelected(null)}
            />
          ) : (
            <InfoPanel title={STEPS[step].title}>
              <p className="-mt-2 text-body-md text-text-body">{STEPS[step].text}</p>
              <InfoSection title={`주의할 칸 ${watch.length}개`}>
                <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                  {watch.map(({ b, look }) => (
                    <li key={b.part_id}>
                      <button
                        type="button"
                        onClick={() => focusOn(b.part_id)}
                        className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-bg-subtle"
                      >
                        <span className="flex flex-col">
                          <span className="text-label-md text-text-heading">
                            {partName(b.part_id)}
                          </span>
                          <span className="text-label-sm text-text-secondary">
                            {partOf.get(b.part_id)?.location}
                          </span>
                        </span>
                        <DotTag as="span" tone={LOOK_TONE[look]}>
                          {BIN_LOOK_LABEL[look]}
                        </DotTag>
                      </button>
                    </li>
                  ))}
                </ul>
              </InfoSection>
            </InfoPanel>
          )}
        </div>
      </div>

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
          <span className="text-label-sm text-text-secondary">
            {day === 0 ? `${formatComputedAt(data.computed_at)} 계산 기준` : '예측 (중앙값 경로)'}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <input
            type="range"
            min={0}
            max={horizon}
            value={day}
            onChange={(e) => {
              setPlaying(false);
              setDay(Number(e.target.value));
            }}
            aria-label="예측 날짜"
            aria-valuetext={`${shortDate(date)}${day === 0 ? ' 오늘' : `, ${day}일 뒤`}`}
            className="w-full accent-bg-inverse"
          />
          <div aria-hidden className="flex justify-between text-label-sm text-text-secondary">
            {[0, 14, 28, 42, 56].map((d) => (
              <span key={d}>
                {shortDate(addDays(base, d))}
                {d === 0 ? ' 오늘' : ''}
              </span>
            ))}
          </div>
        </div>
        <Segmented
          label="예측 기준"
          options={[
            ['no', '발주 안 하면'],
            ['yes', '발주하면'],
          ]}
          value={withOrders ? 'yes' : 'no'}
          onChange={(v) => setWithOrders(v === 'yes')}
        />
      </div>
      <p className="text-label-sm text-text-secondary">
        3D는 계산하지 않고 그리기만 해요. 색·숫자는 서버의 8주 예측(중앙값 경로)과 같은 값이에요
        {data.is_mock ? ' — 지금은 목업 데이터예요' : ''}. 끌어서 돌려 보고, 칸이나 설비를 누르면
        자세히 볼 수 있어요.
      </p>
    </div>
  );
};

const LAYER_SWATCH: Record<TwinLayerKey, string> = {
  status: 'bg-orange-500',
  hidden: 'ring-2 ring-inset ring-brand-500',
  suspect: 'bg-gray-900',
  impact: 'bg-red-500',
  dock: 'bg-sub-300',
};

// 층 켜고 끄기 — 켜지면 흰 알약, 꺼지면 흐리게 (aria-pressed)
const LayerToggle = ({
  layer,
  label,
  on,
  onToggle,
}: {
  layer: TwinLayerKey;
  label: string;
  on: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onToggle}
    className={`flex h-9 items-center gap-2 rounded-full bg-bg-surface px-3 text-label-sm text-text-body shadow-card transition-opacity ${on ? '' : 'opacity-50'}`}
  >
    <span aria-hidden className={`size-3 rounded-full ${LAYER_SWATCH[layer]}`} />
    {label}
  </button>
);

const TwinTable = ({
  bins,
  day,
  lookOf,
  partOf,
  onSelect,
}: {
  bins: TwinBin[];
  day: number;
  lookOf: (b: TwinBin) => BinLook;
  partOf: Map<string, Part>;
  onSelect: (partId: string) => void;
}) => (
  <div className={TABLE_CARD}>
    <table className={`${TABLE} tabular-nums`}>
      <thead>
        <tr>
          <th scope="col" className={`${TH} text-left`}>
            부품
          </th>
          <th scope="col" className={`${TH} text-left`}>
            위치
          </th>
          <th scope="col" className={`${TH} text-right`}>
            {day === 0 ? '현재 재고' : `${day}일 뒤 재고`}
          </th>
          <th scope="col" className={`${TH} text-right`}>
            결품 확률
          </th>
          <th scope="col" className={`${TH} text-left`}>
            상태
          </th>
        </tr>
      </thead>
      <tbody>
        {bins.map((b) => {
          const part = partOf.get(b.part_id);
          if (!part) return null;
          const look = lookOf(b);
          return (
            <tr key={b.part_id} className={TR}>
              <td className={TD}>
                <button
                  type="button"
                  onClick={() => onSelect(b.part_id)}
                  className="text-label-md text-text-heading hover:text-text-brand"
                >
                  {part.name}
                </button>
              </td>
              <td className={`${TD} text-text-body`}>{part.location ?? '—'}</td>
              <td className={`${TD} text-right text-text-heading`}>
                {formatQty(Math.round(b.qty[day] * 10) / 10, part.unit)}
              </td>
              <td className={`${TD} text-right text-text-body`}>
                {Math.round(b.p_out[day] * 100)}%
              </td>
              <td className={TD}>
                <DotTag as="span" tone={LOOK_TONE[look]}>
                  {BIN_LOOK_LABEL[look]}
                </DotTag>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default WarehouseView;
