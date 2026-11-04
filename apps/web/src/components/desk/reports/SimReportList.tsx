'use client';

import { FileText } from 'lucide-react';

import Button from '@bjk/ui/components/Button';

import EmptyState from '@/components/ui/EmptyState';
import { useSimReports } from '@/hooks/report/useReports';
import { formatComputedAt } from '@/utils/format';

// 검증 리포트 (F-SIM). 합성 데이터·시나리오로 검토 기준값을 평가한 결과를 개발팀이 올린다.
const SimReportList = () => {
  const { data: reports, isPending, isError, refetch } = useSimReports();

  if (isPending) {
    return <p className="text-body-md text-text-secondary">검증 리포트를 불러오는 중이에요…</p>;
  }
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-body-md text-text-danger">검증 리포트를 불러오지 못했어요.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }
  if (reports.length === 0) {
    return (
      <EmptyState title="아직 검증 리포트가 없어요">
        검증을 돌리면 검토 기준값이 잘 맞는지 확인한 결과가 여기에 쌓여요.
      </EmptyState>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {reports.map((r) => (
        <li
          key={r.id}
          className="flex items-center justify-between gap-4 rounded-xl bg-bg-surface p-6 shadow-card"
        >
          <div className="flex flex-col gap-1">
            <span className="text-label-lg text-text-heading">{r.title}</span>
            <time
              dateTime={r.created_at}
              className="text-label-sm text-text-secondary tabular-nums"
            >
              {formatComputedAt(r.created_at)}
            </time>
          </div>
          {r.pdf_url ? (
            <a
              href={r.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-bg-brand-subtle px-5 py-3 text-label-md text-text-brand hover:bg-bg-brand-subtle-hover"
            >
              <FileText size={16} aria-hidden />
              리포트 열기
            </a>
          ) : (
            <span className="text-label-sm text-text-secondary">만드는 중이에요</span>
          )}
        </li>
      ))}
    </ul>
  );
};

export default SimReportList;
