'use client';

import { Combine, Eye } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { MergeCandidate } from '@bjk/api/types/audit';
import type { TwinBin, TwinLayout } from '@bjk/api/types/twin';
import Button from '@bjk/ui/components/Button';

import { InfoSection } from '@/components/ui/InfoPanel';
import { useMergeCandidates, useMergeParts } from '@/hooks/audit/useMergeCandidates';
import { useParts } from '@/hooks/part/useParts';
import { useWarehouseBridge } from '@/hooks/twin/useWarehouseBridge';
import { apiErrorMessage } from '@/utils/apiError';
import { formatQty } from '@/utils/format';
import { locsByPart } from '@/utils/twin';

import type { BinSectionProps, OverviewSectionProps } from './types';

const ROW =
  'flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-bg-subtle';

// 숨은 재고 (W-11 × W-07, F-MATCH-03). twin 의 same_spec_group 이 같은 칸끼리가 한 묶음이다.
// 병합 후보(/merge-candidates)와는 part id 로 잇는다 — 그룹 키(정규화한 규격)와 후보 id 는 서로 모른다.
const groupsOf = (bins: TwinBin[]) => {
  const groups = new Map<string, TwinBin[]>();
  for (const b of bins) {
    if (b.same_spec_group === null) continue;
    groups.set(b.same_spec_group, [...(groups.get(b.same_spec_group) ?? []), b]);
  }
  return [...groups].filter(([, members]) => members.length > 1);
};

const locsOfGroup = (layout: TwinLayout, members: TwinBin[]) => {
  const locsOf = locsByPart(layout.placements);
  return members.flatMap((b) => locsOf.get(b.part_id) ?? []);
};

type MergeDialogProps = {
  candidate: MergeCandidate;
  onClose: () => void;
};

// 병합은 되돌릴 수 없어 모달에서 대표 부품을 고르고 한 번 더 확인한다 (desk.md).
// 흐름은 숨은 재고 화면(HiddenStockList)의 확인 단계와 같다. <dialog>.showModal 이 포커스 가두기·Esc 를 맡는다
const MergeDialog = ({ candidate, onClose }: MergeDialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  const merge = useMergeParts();
  const [primaryId, setPrimaryId] = useState(candidate.parts[0].id);
  const total = candidate.parts[0].stock + candidate.parts[1].stock;
  const unit = candidate.parts[0].unit;

  // 닫기는 정리 함수에서 하지 않는다 — StrictMode 의 가짜 언마운트에서 close 이벤트가 onClose 를 불러 모달이 바로 사라진다.
  // 언마운트되면 요소가 DOM 에서 빠지면서 top layer 에서도 내려간다
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`merge-title-${candidate.id}`}
      onClose={onClose}
      className="m-auto w-full max-w-md rounded-xl bg-bg-surface p-6 shadow-raised backdrop:bg-bg-inverse/40"
    >
      <div className="flex flex-col gap-4">
        <h2 id={`merge-title-${candidate.id}`} className="text-h3 text-text-heading">
          규격 {candidate.spec} 합치기
        </h2>
        <fieldset className="flex flex-col gap-2" disabled={merge.isPending}>
          <legend className="mb-2 text-label-md text-text-secondary">대표 부품</legend>
          {candidate.parts.map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border p-4 ${primaryId === p.id ? 'border-border-brand bg-bg-brand-subtle' : 'border-border-default'}`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`merge-primary-${candidate.id}`}
                  value={p.id}
                  checked={primaryId === p.id}
                  onChange={() => setPrimaryId(p.id)}
                  className="accent-bg-brand"
                />
                <span className="text-label-md text-text-heading">{p.name}</span>
              </span>
              <span className="text-body-sm text-text-body tabular-nums">
                {formatQty(p.stock, p.unit)}
              </span>
            </label>
          ))}
        </fieldset>
        <p className="rounded-md bg-bg-subtle p-4 text-body-md text-text-body">
          원장 기록은 그대로 두고, 재고는 합쳐서{' '}
          <strong className="text-label-lg tabular-nums">{formatQty(total, unit)}</strong>로
          계산해요. 다른 쪽 이름은 대표 부품의 별칭이 돼요. 되돌릴 수 없어요.
        </p>
        {merge.error ? (
          <p role="alert" className="text-body-sm text-text-danger">
            {apiErrorMessage(merge.error, '병합하지 못했어요.')}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={merge.isPending}
            onClick={() => ref.current?.close()}
          >
            취소
          </Button>
          <Button
            disabled={merge.isPending}
            onClick={() =>
              merge.mutate(
                { id: candidate.id, primaryPartId: primaryId },
                { onSuccess: () => ref.current?.close() },
              )
            }
          >
            {merge.isPending ? '병합 중…' : '병합 확인'}
          </Button>
        </div>
      </div>
    </dialog>
  );
};

// 칸을 골랐을 때 — 같은 묶음의 다른 칸, 같이 보기, 병합
const HiddenStockSection = ({ layout, projection, part, bin, day }: BinSectionProps) => {
  const bridge = useWarehouseBridge();
  const parts = useParts({});
  const candidates = useMergeCandidates();
  const [merging, setMerging] = useState<MergeCandidate | null>(null);

  if (bin.same_spec_group === null) return null;
  const members = projection.bins.filter((b) => b.same_spec_group === bin.same_spec_group);
  const others = members.filter((b) => b.part_id !== bin.part_id);
  if (!others.length) return null;

  const partOf = new Map((parts.data ?? []).map((p) => [p.id, p]));
  const locsOf = locsByPart(layout.placements);
  const memberIds = new Set(members.map((b) => b.part_id));
  const candidate = candidates.data?.find(
    (c) =>
      c.status === 'open' &&
      c.parts.some((p) => p.id === bin.part_id) &&
      c.parts.every((p) => memberIds.has(p.id)),
  );
  const label = `${part.spec ?? part.name} 숨은 재고`;

  return (
    <InfoSection title="숨은 재고">
      <p className="text-body-sm text-text-secondary">
        같은 규격이 다른 이름으로 {others.length}칸 더 있어요.
      </p>
      <ul className="flex flex-col gap-1">
        {others.map((b) => {
          const other = partOf.get(b.part_id);
          const loc = locsOf.get(b.part_id)?.[0];
          return (
            <li key={b.part_id}>
              <button
                type="button"
                disabled={!loc}
                onClick={() => loc && bridge.goTo(loc)}
                className={ROW}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-label-md text-text-heading">
                    {other?.name ?? b.part_id}
                  </span>
                  <span className="text-label-sm text-text-secondary">
                    {other?.location ?? loc}
                  </span>
                </span>
                <span className="shrink-0 text-label-md text-text-body tabular-nums">
                  {formatQty(Math.round(b.qty[day] * 10) / 10, other?.unit ?? part.unit)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => bridge.focus(locsOfGroup(layout, members), label)}
        >
          <Eye size={16} aria-hidden />
          같이 보기
        </Button>
        {candidate ? (
          <Button onClick={() => setMerging(candidate)}>
            <Combine size={16} aria-hidden />
            합치기
          </Button>
        ) : null}
      </div>
      {merging ? <MergeDialog candidate={merging} onClose={() => setMerging(null)} /> : null}
    </InfoSection>
  );
};

// 아무것도 고르지 않았을 때 — 숨은 재고 묶음 목록. 누르면 그 묶음을 같이 본다
export const HiddenStockOverview = ({ layout, projection }: OverviewSectionProps) => {
  const bridge = useWarehouseBridge();
  const parts = useParts({});
  const groups = groupsOf(projection.bins);
  if (!groups.length) return null;

  const partOf = new Map((parts.data ?? []).map((p) => [p.id, p]));

  return (
    <InfoSection title={`숨은 재고 ${groups.length}묶음`}>
      <ul className="flex flex-col gap-1">
        {groups.map(([group, members]) => {
          const names = members.map((b) => partOf.get(b.part_id)?.name ?? b.part_id);
          const spec = partOf.get(members[0].part_id)?.spec ?? group;
          return (
            <li key={group}>
              <button
                type="button"
                onClick={() => bridge.focus(locsOfGroup(layout, members), `${spec} 숨은 재고`)}
                className={ROW}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-label-md text-text-heading">규격 {spec}</span>
                  <span className="truncate text-label-sm text-text-secondary">
                    {names.join(' · ')}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-label-sm text-text-brand">
                  <Eye size={16} aria-hidden />
                  같이 보기
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </InfoSection>
  );
};

export default HiddenStockSection;
