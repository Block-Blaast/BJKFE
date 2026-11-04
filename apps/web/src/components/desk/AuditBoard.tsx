'use client';

import { CircleAlert, Info, Send, TriangleAlert, type LucideIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AUDIT_RULES, type AuditGrade } from '@bjk/api/domain/audit';
import type { AuditItem } from '@bjk/api/types/audit';
import Button from '@bjk/ui/components/Button';

import Tag, { type TagTone } from '@/components/ui/Tag';
import { useAudits, useCompanyStaff, useRequestAudit } from '@/hooks/audit/useAudits';
import { apiErrorMessage } from '@/utils/apiError';
import { formatComputedAt, formatQty } from '@/utils/format';

const GRADE_TAG: Record<AuditGrade, { tone: TagTone; icon: LucideIcon }> = {
  높음: { tone: 'danger', icon: TriangleAlert },
  중간: { tone: 'warning', icon: CircleAlert },
  낮음: { tone: 'neutral', icon: Info },
};

const SELECT_CLASS =
  'h-11 rounded-md border border-border-strong bg-bg-surface px-3 text-body-sm text-text-body outline-none focus:border-border-brand';

const RequestForm = ({ audit }: { audit: AuditItem }) => {
  const staff = useCompanyStaff();
  const request = useRequestAudit();
  const [assigneeId, setAssigneeId] = useState('');
  // 실사는 현장 작업자에게 요청한다
  const workers = staff.data?.filter((m) => m.role === 'worker') ?? [];

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        request.mutate({ id: audit.id, assigneeId });
      }}
    >
      <label className="sr-only" htmlFor={`assignee-${audit.id}`}>
        담당 작업자
      </label>
      <select
        id={`assignee-${audit.id}`}
        className={SELECT_CLASS}
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
      </select>
      <Button type="submit" disabled={!assigneeId || request.isPending}>
        <Send size={16} aria-hidden />
        {request.isPending ? '요청 중…' : '실사 요청'}
      </Button>
      {request.isError ? (
        <p role="alert" className="w-full text-body-sm text-text-danger">
          {apiErrorMessage(request.error, '실사를 요청하지 못했어요.')}
        </p>
      ) : null}
    </form>
  );
};

const Outcome = ({ audit }: { audit: AuditItem }) => {
  if (audit.result) {
    const diff = audit.result.counted_qty - audit.ledger_qty;
    return diff === 0 ? (
      <p className="text-body-sm text-text-success">
        이상 없음 — 30일 동안 같은 규칙으로 다시 띄우지 않아요.
      </p>
    ) : (
      <p className="text-body-sm text-text-body tabular-nums">
        실제 {formatQty(audit.result.counted_qty, audit.part.unit)} (차이 {diff > 0 ? '+' : ''}
        {formatQty(diff, audit.part.unit)}) · 사유 {audit.result.adjust_reason ?? '—'} · 실사조정
        기록됨
      </p>
    );
  }
  if (audit.request) {
    return (
      <p className="text-body-sm text-text-body tabular-nums">
        {audit.request.assignee.name}님께 실사 요청함 ·{' '}
        {formatComputedAt(audit.request.requested_at)} · 응답을 기다리는 중
      </p>
    );
  }
  return <RequestForm audit={audit} />;
};

// 장부 검증 (W-06, F-AUDIT-06). 의심 항목을 등급순으로 보여주고 실사를 요청한다.
// 실사 응답은 작업자 채팅(F-CHAT-05)으로 들어와 항목을 닫는다.
// usePathname·useSearchParams 를 쓰므로 페이지에서 <Suspense> 로 감싼다.
const AuditBoard = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') === 'resolved' ? 'resolved' : 'active';
  const { data: audits, isPending, isError, refetch } = useAudits({ status });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit rounded-md bg-bg-subtle p-1" role="group" aria-label="상태">
        {(
          [
            ['active', '처리 전'],
            ['resolved', '처리 완료'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            className={`h-9 rounded-md px-4 text-label-md ${status === value ? 'bg-bg-surface text-text-heading shadow-card' : 'text-text-secondary'}`}
            onClick={() =>
              router.replace(value === 'active' ? pathname : `${pathname}?status=resolved`, {
                scroll: false,
              })
            }
          >
            {label}
          </button>
        ))}
      </div>

      {isPending ? (
        <p className="text-body-md text-text-secondary">의심 항목을 불러오는 중이에요…</p>
      ) : isError ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-body-md text-text-danger">의심 항목을 불러오지 못했어요.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            다시 시도
          </Button>
        </div>
      ) : audits.length === 0 ? (
        <p className="rounded-md bg-bg-surface p-8 text-center text-body-md text-text-secondary shadow-card">
          {status === 'active' ? '지금은 의심 항목이 없어요.' : '처리한 항목이 아직 없어요.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {audits.map((audit) => (
            <li
              key={audit.id}
              className="flex flex-col gap-3 rounded-md bg-bg-surface p-5 shadow-card"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Tag {...GRADE_TAG[audit.grade]}>의심 {audit.grade}</Tag>
                <span className="text-label-lg text-text-heading">{audit.part.name}</span>
                <span className="text-body-sm text-text-secondary">
                  {AUDIT_RULES[audit.rule].name} ({audit.rule})
                </span>
                <span className="ml-auto text-body-sm text-text-body tabular-nums">
                  장부상 {formatQty(audit.ledger_qty, audit.part.unit)}
                </span>
              </div>
              <p className="text-body-md text-text-body">{audit.reason}</p>
              <Outcome audit={audit} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AuditBoard;
