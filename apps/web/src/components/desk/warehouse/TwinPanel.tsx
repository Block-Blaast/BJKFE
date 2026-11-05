'use client';

import { ArrowRight, X } from 'lucide-react';
import Link from 'next/link';

import type { Part } from '@bjk/api/types/part';
import type { TwinArrival, TwinBin, TwinEquipmentProjection } from '@bjk/api/types/twin';

import InfoPanel, { DotTag, InfoSection, PropertyList } from '@/components/ui/InfoPanel';
import { formatQty, formatWon } from '@/utils/format';
import {
  BIN_LOOK_LABEL,
  EQUIPMENT_STATUS_LABEL,
  LOOK_TONE,
  shortDate,
  type BinLook,
} from '@/utils/twin';

const EMPTY = '—';

const LINK = 'flex h-10 w-fit items-center gap-1 rounded-full px-4 text-label-sm transition-colors';

const CloseButton = ({ onClose }: { onClose: () => void }) => (
  <button
    type="button"
    onClick={onClose}
    aria-label="닫기"
    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-body transition-colors hover:bg-bg-brand-subtle hover:text-text-brand"
  >
    <X size={16} aria-hidden />
  </button>
);

type BinPanelProps = {
  part: Part;
  bin: TwinBin;
  look: BinLook;
  day: number;
  equipmentNames: string[];
  arrivals: TwinArrival[];
  sameSpec: { part: Part; qty: number }[];
  onClose: () => void;
};

// 선택한 칸 — 숫자는 모두 /twin/projection 에서 온다
export const BinPanel = ({
  part,
  bin,
  look,
  day,
  equipmentNames,
  arrivals,
  sameSpec,
  onClose,
}: BinPanelProps) => (
  <InfoPanel title={part.name}>
    <div className="-mt-4 flex items-start justify-between gap-3">
      <span className="text-body-sm text-text-secondary">{part.location ?? EMPTY}</span>
      <CloseButton onClose={onClose} />
    </div>
    <DotTag as="span" tone={LOOK_TONE[look]}>
      {BIN_LOOK_LABEL[look]}
    </DotTag>
    <PropertyList
      items={[
        {
          label: day === 0 ? '현재 재고' : `${day}일 뒤 예측 재고`,
          value: formatQty(Math.round(bin.qty[day] * 10) / 10, part.unit),
        },
        {
          label: '재주문점',
          value: bin.reorder_point === null ? EMPTY : formatQty(bin.reorder_point, part.unit),
        },
        { label: '결품 확률', value: `${Math.round(bin.p_out[day] * 100)}%` },
        { label: '쓰는 설비', value: equipmentNames.join(', ') || EMPTY },
        {
          label: '정비 필요량',
          value:
            bin.maintenance.map((m) => `${shortDate(m.date)} ${m.qty}${part.unit}`).join(', ') ||
            EMPTY,
        },
        {
          label: '입고 예정',
          value:
            arrivals
              .map(
                (a) =>
                  `${a.qty}${part.unit} ${shortDate(a.eta)}${a.kind === 'proposal' ? ' (발주하면)' : ''}`,
              )
              .join(', ') || EMPTY,
        },
      ]}
    />
    {sameSpec.length ? (
      <InfoSection title="같은 규격, 다른 이름">
        <ul className="flex flex-col gap-2">
          {sameSpec.map(({ part: other, qty }) => (
            <li key={other.id} className="flex flex-col rounded-md bg-bg-page px-3 py-2">
              <span className="text-label-md text-text-heading">
                {other.name} {formatQty(qty, other.unit)}
              </span>
              <span className="text-label-sm text-text-secondary">{other.location}</span>
            </li>
          ))}
        </ul>
      </InfoSection>
    ) : null}
    {bin.audit ? (
      <InfoSection title="장부 의심">
        <p className="text-body-sm text-text-body">{bin.audit.reason}</p>
      </InfoSection>
    ) : null}
    <div className="flex flex-wrap gap-2">
      <Link href={`/parts/${part.id}`} className={`${LINK} bg-bg-inverse text-text-on-inverse`}>
        부품 상세 열기
        <ArrowRight size={14} aria-hidden />
      </Link>
      {bin.audit || bin.same_spec_group ? (
        <Link
          href={bin.audit ? '/audit' : '/hidden-stock'}
          className={`${LINK} bg-bg-subtle text-text-body hover:bg-bg-brand-subtle hover:text-text-brand`}
        >
          {bin.audit ? '실사 요청하기' : '숨은 재고 합치기'}
          <ArrowRight size={14} aria-hidden />
        </Link>
      ) : null}
    </div>
  </InfoPanel>
);

type EquipmentPanelProps = {
  name: string;
  projection: TwinEquipmentProjection;
  day: number;
  partName: (id: string) => string;
  usedParts: string[];
  onClose: () => void;
};

export const EquipmentPanel = ({
  name,
  projection,
  day,
  partName,
  usedParts,
  onClose,
}: EquipmentPanelProps) => {
  const status = projection.status[day];
  const loss = projection.loss[day];
  return (
    <InfoPanel title={name}>
      <div className="-mt-4 flex items-start justify-between gap-3">
        <DotTag
          as="span"
          tone={status === 'down' ? 'danger' : status === 'warn' ? 'warning' : 'neutral'}
        >
          {EQUIPMENT_STATUS_LABEL[status]}
        </DotTag>
        <CloseButton onClose={onClose} />
      </div>
      <PropertyList
        items={[
          {
            label: '예상 손실',
            value:
              status !== 'down'
                ? EMPTY
                : loss === null
                  ? '손실액 미등록'
                  : `${formatWon(loss)} (추정)`,
          },
          {
            label: status === 'down' ? '멈추게 하는 부품' : '위험한 부품',
            value: projection.cause_part_ids[day].map(partName).join(', ') || EMPTY,
          },
        ]}
      />
      <InfoSection title="쓰는 부품">
        <ul className="flex flex-wrap gap-2">
          {usedParts.map((id) => (
            <DotTag key={id}>{partName(id)}</DotTag>
          ))}
        </ul>
      </InfoSection>
    </InfoPanel>
  );
};
