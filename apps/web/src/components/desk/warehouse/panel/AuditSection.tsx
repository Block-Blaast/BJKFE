'use client';

import { ArrowRight, CircleAlert, Info, Send, TriangleAlert, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AUDIT_GRADES, type AuditGrade } from '@bjk/api/domain/audit';
import type { AuditItem } from '@bjk/api/types/audit';
import type { TwinBin } from '@bjk/api/types/twin';
import Button from '@bjk/ui/components/Button';

import { InfoSection } from '@/components/ui/InfoPanel';
import Select from '@/components/ui/Select';
import Tag, { type TagTone } from '@/components/ui/Tag';
import { useAudits, useCompanyStaff, useRequestAudit } from '@/hooks/audit/useAudits';
import { useParts } from '@/hooks/part/useParts';
import { useWarehouseBridge } from '@/hooks/twin/useWarehouseBridge';
import { apiErrorMessage } from '@/utils/apiError';
import { formatComputedAt } from '@/utils/format';
import { locsByPart } from '@/utils/twin';

import type { BinSectionProps, OverviewSectionProps } from './types';

const GRADE_TAG: Record<AuditGrade, { tone: TagTone; icon: LucideIcon }> = {
  높음: { tone: 'danger', icon: TriangleAlert },
  중간: { tone: 'warning', icon: CircleAlert },
  낮음: { tone: 'neutral', icon: Info },
};

const ROW =
  'flex w-full flex-col gap-1 rounded-md px-2 py-2 text-left transition-colors hover:bg-bg-subtle disabled:hover:bg-transparent';

const LINK =
  'flex h-10 w-fit items-center gap-1 rounded-full bg-bg-subtle px-4 text-label-sm text-text-body transition-colors hover:bg-bg-brand-subtle hover:text-text-brand';

// twin 응답의 grade 는 string 이라 도메인 등급으로 좁혀서만 태그를 그린다
const GradeTag = ({ grade }: { grade: string }) => {
  const g = AUDIT_GRADES.find((x) => x === grade);
  return g ? <Tag {...GRADE_TAG[g]}>우선순위 {g}</Tag> : null;
};

// AuditBoard(W-06)의 실사 요청과 같은 흐름 — 현장 작업자에게만 요청한다
const RequestForm = ({ auditId }: { auditId: string }) => {
  const staff = useCompanyStaff();
  const request = useRequestAudit();
  const [assigneeId, setAssigneeId] = useState('');
  const workers = staff.data?.filter((m) => m.role === 'worker') ?? [];

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        request.mutate({ id: auditId, assigneeId });
      }}
    >
      <label className="sr-only" htmlFor={`twin-assignee-${auditId}`}>
        담당 작업자
      </label>
      <Select
        id={`twin-assignee-${auditId}`}
        variant="pill"
        className="w-full"
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
        disabled={staff.isPending}
      >
        <option value="">{staff.isPending ? '직원 불러오는 중…' : '담당 작업자 선택'}</option>
        {workers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </Select>
      <Button type="submit" disabled={!assigneeId || request.isPending}>
        <Send size={16} aria-hidden />
        {request.isPending ? '요청 중…' : '실사 요청'}
      </Button>
      {request.isError ? (
        <p role="alert" className="text-body-sm text-text-danger">
          {apiErrorMessage(request.error, '실사를 요청하지 못했어요.')}
        </p>
      ) : null}
    </form>
  );
};

// 요청 여부는 twin 응답에 없어 /audits 목록(같은 id)에서 읽는다
const RequestState = ({ item, auditId }: { item: AuditItem | undefined; auditId: string }) =>
  item?.request ? (
    <p className="text-body-sm text-text-body tabular-nums">
      {item.request.assignee ? `${item.request.assignee.name}님께 ` : ''}실사 요청함 ·{' '}
      {formatComputedAt(item.request.requested_at)} · 작업자 채팅으로 실제 수량이 들어오면 기록이
      맞춰져요
    </p>
  ) : (
    <RequestForm auditId={auditId} />
  );

// ⑤입고 검수 — 고른 칸의 장부 의심과 실사 요청 (W-11, F-AUDIT-06)
// 실사 조정(장부 수량 변경)은 작업자 채팅 응답(F-CHAT-05)으로만 일어나 여기서 바꾸지 않는다
const AuditSection = ({ bin }: BinSectionProps) => {
  const audits = useAudits({ status: 'active' });
  if (!bin.audit) return null;
  const item = audits.data?.find((a) => a.id === bin.audit?.id);
  return (
    <InfoSection title="실사">
      <div className="flex flex-col gap-3 rounded-md bg-bg-page p-3">
        <GradeTag grade={bin.audit.grade} />
        {audits.isPending ? (
          <p className="text-body-sm text-text-secondary">요청 상태를 불러오는 중…</p>
        ) : (
          <RequestState item={item} auditId={bin.audit.id} />
        )}
      </div>
      <Link href="/audit" className={LINK}>
        재고 맞춰보기 열기
        <ArrowRight size={14} aria-hidden />
      </Link>
    </InfoSection>
  );
};

// 아무것도 안 골랐을 때 — 장부 의심이 열린 칸 전체
export const AuditOverviewSection = ({ projection, layout }: OverviewSectionProps) => {
  const bridge = useWarehouseBridge();
  const parts = useParts({});
  const partMap = new Map((parts.data ?? []).map((p) => [p.id, p]));
  const locsOf = locsByPart(layout.placements);
  const suspects = projection.bins.filter(
    (b): b is TwinBin & { audit: NonNullable<TwinBin['audit']> } => b.audit !== null,
  );
  if (!suspects.length) return null;
  return (
    <InfoSection title={`재고 확인 필요 ${suspects.length}칸`}>
      <ul className="flex flex-col gap-1">
        {suspects.map((b) => {
          const loc = locsOf.get(b.part_id)?.[0];
          const part = partMap.get(b.part_id);
          return (
            <li key={b.part_id}>
              <button
                type="button"
                disabled={!loc}
                onClick={() => loc && bridge.goTo(loc)}
                className={ROW}
              >
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="truncate text-label-md text-text-heading">
                    {part?.name ?? b.part_id}
                  </span>
                  <GradeTag grade={b.audit.grade} />
                </span>
                <span className="text-body-sm text-text-secondary">{b.audit.reason}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Link href="/audit" className={LINK}>
        재고 맞춰보기 열기
        <ArrowRight size={14} aria-hidden />
      </Link>
    </InfoSection>
  );
};

export default AuditSection;
