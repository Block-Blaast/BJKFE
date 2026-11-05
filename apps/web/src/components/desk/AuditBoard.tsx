'use client';

import { CircleAlert, Info, Send, TriangleAlert, type LucideIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AUDIT_GRADES, AUDIT_RULES, type AuditGrade } from '@bjk/api/domain/audit';
import type { AuditItem } from '@bjk/api/types/audit';
import Button from '@bjk/ui/components/Button';

import { SkeletonList } from '@/components/ui/feedback/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import Select from '@/components/ui/Select';
import Tag, { type TagTone } from '@/components/ui/Tag';
import EmptyState from '@/components/ui/EmptyState';
import FolderCard from '@/components/ui/FolderCard';
import Segmented from '@/components/ui/Segmented';
import { useAudits, useCompanyStaff, useRequestAudit } from '@/hooks/audit/useAudits';
import { apiErrorMessage } from '@/utils/apiError';
import { formatComputedAt, formatQty } from '@/utils/format';

const GRADE_TAG: Record<AuditGrade, { tone: TagTone; icon: LucideIcon }> = {
  높음: { tone: 'danger', icon: TriangleAlert },
  중간: { tone: 'warning', icon: CircleAlert },
  낮음: { tone: 'neutral', icon: Info },
};

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
      <Select
        id={`assignee-${audit.id}`}
        variant="pill"
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
        <p role="alert" className="w-full text-body-sm text-text-danger">
          {apiErrorMessage(request.error, '실사를 요청하지 못했어요.')}
        </p>
      ) : null}
    </form>
  );
};

const Outcome = ({ audit }: { audit: AuditItem }) => {
  if (audit.result && audit.ledger_qty !== null) {
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
  // 백엔드 목록은 실사 결과를 주지 않는다 — 닫힌 항목은 닫혔다는 것만 보인다
  if (audit.status === 'resolved') {
    return (
      <p className="text-body-sm text-text-body tabular-nums">
        실사로 확인을 마쳤어요 · 차이가 있었다면 실사조정이 기록됐어요
      </p>
    );
  }
  if (audit.request) {
    return (
      <p className="text-body-sm text-text-body tabular-nums">
        {audit.request.assignee ? `${audit.request.assignee.name}님께 ` : ''}실사 요청함 ·{' '}
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
  const rawGrade = searchParams.get('grade');
  const grade = AUDIT_GRADES.find((g) => g === rawGrade);
  const { data: all, isPending, isError, refetch } = useAudits({ status });
  // 등급은 화면에서 거른다 — 의심 항목은 많아야 수십 건이라 서버 필터를 따로 두지 않았다
  const audits = all?.filter((a) => !grade || a.grade === grade);
  const countOf = (g?: AuditGrade) =>
    all ? `${all.filter((a) => !g || a.grade === g).length}건` : '…';

  const go = (next: { status?: 'active' | 'resolved'; grade?: AuditGrade }) => {
    const params = new URLSearchParams();
    if ((next.status ?? status) === 'resolved') params.set('status', 'resolved');
    const g = 'grade' in next ? next.grade : grade;
    if (g) params.set('grade', g);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="확인 우선순위" className="grid grid-cols-5 gap-5">
        <FolderCard
          title="전체"
          count={countOf()}
          foot={status === 'active' ? '직접 세어 기록을 맞춰요' : '처리를 마친 항목'}
          selected={!grade}
          onClick={() => go({ grade: undefined })}
        />
        {AUDIT_GRADES.map((g) => (
          <FolderCard
            key={g}
            title={`우선순위 ${g}`}
            count={countOf(g)}
            foot={Object.values(AUDIT_RULES)
              .filter((r) => r.grade === g)
              .map((r) => r.name)
              .join(' · ')}
            selected={grade === g}
            onClick={() => go({ grade: g })}
          />
        ))}
      </nav>
      <Segmented
        label="상태"
        options={
          [
            ['active', '처리 전'],
            ['resolved', '처리 완료'],
          ] as const
        }
        value={status}
        onChange={(value) => go({ status: value })}
      />

      {isPending ? (
        <SkeletonList label="확인할 재고를 불러오는 중" rows={3} />
      ) : isError ? (
        <ErrorState title="확인할 재고를 불러오지 못했어요" onRetry={() => refetch()} />
      ) : !audits || audits.length === 0 ? (
        <EmptyState
          title={status === 'active' ? '지금은 확인할 재고가 없어요' : '처리한 항목이 아직 없어요'}
        >
          {status === 'active'
            ? '기록과 실제 수량이 다를 수 있는 부품이 생기면 여기에 보여요.'
            : null}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {audits.map((audit) => (
            <li
              key={audit.id}
              className="flex flex-col gap-4 rounded-xl bg-bg-surface p-6 shadow-card"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Tag {...GRADE_TAG[audit.grade]}>우선순위 {audit.grade}</Tag>
                <span className="text-label-lg text-text-heading">{audit.part.name}</span>
                <span className="text-body-sm text-text-secondary">
                  {AUDIT_RULES[audit.rule].name} ({audit.rule})
                </span>
                {/* 블라인드 실사(F-AUDIT-06): 백엔드는 응답 전 장부 수량을 주지 않는다 */}
                {audit.ledger_qty !== null ? (
                  <span className="ml-auto text-body-sm text-text-body tabular-nums">
                    기록상 {formatQty(audit.ledger_qty, audit.part.unit)}
                  </span>
                ) : null}
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
