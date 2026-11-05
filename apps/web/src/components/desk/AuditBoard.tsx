'use client';

import { CircleAlert, Info, Send, TriangleAlert, type LucideIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AUDIT_GRADES, AUDIT_RULES, type AuditGrade } from '@bjk/api/domain/audit';
import type { AuditItem } from '@bjk/api/types/audit';
import Button from '@bjk/ui/components/Button';

import ErrorState from '@/components/ui/ErrorState';
import Select from '@/components/ui/Select';
import Tag, { type TagTone } from '@/components/ui/Tag';
import EmptyState from '@/components/ui/EmptyState';
import FolderCard from '@/components/ui/FolderCard';
import Segmented from '@/components/ui/Segmented';
import { useAudits, useCompanyStaff, useRequestAudit } from '@/hooks/audit/useAudits';
import { apiErrorMessage } from '@/utils/apiError';
import { formatComputedAt } from '@/utils/format';

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

// 실사 결과(센 수량·차이·사유)는 목록 응답에 없어 상태와 바뀐 시각만 보여준다
const Outcome = ({ audit }: { audit: AuditItem }) => {
  if (audit.status === 'resolved') {
    return (
      <p className="text-body-sm text-text-success tabular-nums">
        처리를 마쳤어요 · {formatComputedAt(audit.updated_at)}
      </p>
    );
  }
  if (audit.status === 'requested') {
    return (
      <p className="text-body-sm text-text-body tabular-nums">
        실사 요청함 · {formatComputedAt(audit.updated_at)} · 응답을 기다리는 중
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
        <p className="text-body-md text-text-secondary">확인할 재고를 불러오는 중이에요…</p>
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
