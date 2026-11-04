'use client';

import { Check, Copy, FileText } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { APPROVAL_ACTIONS } from '@bjk/api/domain/review';
import type { PurchaseOrder } from '@bjk/api/types/report';
import Button from '@bjk/ui/components/Button';

import EmptyState from '@/components/ui/EmptyState';
import { usePurchaseOrders } from '@/hooks/report/useReports';
import { formatComputedAt, formatDate, formatQty, formatWon } from '@/utils/format';

const EMPTY = '—';

// 공급사에 보낼 문자 문구: 품목·규격·수량·납기 희망일 (F-APPROVAL-03). 자동 전송은 범위 밖이라 복사만 한다.
const orderMessage = (po: PurchaseOrder) =>
  [
    `[발주] ${po.part.name}${po.part.spec ? ` (${po.part.spec})` : ''}`,
    `수량: ${formatQty(po.qty, po.part.unit)}`,
    po.unit_price === null ? null : `단가: ${formatWon(po.unit_price)}`,
    po.desired_date ? `납기 희망일: ${formatDate(po.desired_date)}` : null,
    '확인 부탁드립니다.',
  ]
    .filter(Boolean)
    .join('\n');

const CopyButton = ({ po }: { po: PurchaseOrder }) => {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  return (
    <Button
      variant="secondary"
      onClick={() =>
        navigator.clipboard.writeText(orderMessage(po)).then(
          () => setState('copied'),
          () => setState('failed'),
        )
      }
    >
      {state === 'copied' ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      {state === 'copied' ? '복사했어요' : state === 'failed' ? '복사 실패' : '발주 문구 복사'}
    </Button>
  );
};

// 발주 기록과 결재용 PDF (F-APPROVAL-03·04). PDF 는 승인 직후 서버가 스냅샷으로 만든다.
const PurchaseOrderList = () => {
  const { data: orders, isPending, isError, refetch } = usePurchaseOrders();

  if (isPending) {
    return <p className="text-body-md text-text-secondary">발주 기록을 불러오는 중이에요…</p>;
  }
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-body-md text-text-danger">발주 기록을 불러오지 못했어요.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }
  if (orders.length === 0) {
    return (
      <EmptyState title="아직 승인된 발주가 없어요">
        <Link href="/reviews" className="text-label-md text-text-brand underline">
          검토함
        </Link>
        에서 승인하면 결재용 PDF와 발주 문구가 바로 만들어져요.
      </EmptyState>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-bg-surface shadow-card">
      <table className="w-full text-body-sm">
        <thead className="bg-bg-page text-label-sm text-text-secondary">
          <tr>
            {['승인 시각', '부품', '수량', '공급사', '총액', '승인', ''].map((h, i) => (
              <th
                key={h || 'actions'}
                scope="col"
                className={`px-4 py-3 font-medium ${i === 2 || i === 4 ? 'text-right' : 'text-left'}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((po) => (
            <tr key={po.id} className="border-t border-border-default">
              <td className="px-4 py-3 text-text-secondary tabular-nums">
                {formatComputedAt(po.approved_at)}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/reviews/${po.review_id}`}
                  className="flex flex-col text-label-md text-text-heading hover:text-text-brand"
                >
                  {po.part.name}
                  {po.part.spec ? (
                    <span className="text-label-sm text-text-secondary">{po.part.spec}</span>
                  ) : null}
                </Link>
              </td>
              <td className="px-4 py-3 text-right text-text-heading tabular-nums">
                {formatQty(po.qty, po.part.unit)}
              </td>
              <td className="px-4 py-3 text-text-body">{po.supplier ?? EMPTY}</td>
              <td className="px-4 py-3 text-right text-text-heading tabular-nums">
                {po.total === null ? EMPTY : formatWon(po.total)}
              </td>
              <td className="px-4 py-3 text-text-body">
                {APPROVAL_ACTIONS[po.action]} · {po.approved_by}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <CopyButton po={po} />
                  {po.pdf_url ? (
                    <a
                      href={po.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-bg-brand px-5 py-3 text-label-md text-text-on-brand hover:bg-bg-brand-hover"
                    >
                      <FileText size={16} aria-hidden />
                      PDF
                    </a>
                  ) : (
                    <Button disabled title="PDF를 만드는 중이에요">
                      <FileText size={16} aria-hidden />
                      PDF 준비 중
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PurchaseOrderList;
