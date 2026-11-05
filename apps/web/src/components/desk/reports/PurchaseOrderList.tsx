'use client';

import { Check, Copy, FileText } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { USES_BACKEND } from '@bjk/api/client';
import { APPROVAL_ACTIONS } from '@bjk/api/domain/review';
import { getPurchaseOrderMessage } from '@bjk/api/reports';
import { openReviewPdf } from '@bjk/api/reviews';
import type { PurchaseOrder } from '@bjk/api/types/report';
import Button from '@bjk/ui/components/Button';

import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { usePurchaseOrders } from '@/hooks/report/useReports';
import { formatComputedAt, formatDate, formatQty, formatWon } from '@/utils/format';
import { TABLE, TABLE_CARD, TD, TH, TR } from '@/components/ui/table';

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
      // 백엔드는 희망 납기까지 넣은 문구를 준다(PO-02). 없으면(목업) 화면이 만든다
      onClick={() =>
        getPurchaseOrderMessage(po.id)
          .then((message) => navigator.clipboard.writeText(message ?? orderMessage(po)))
          .then(
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

const PdfButton = ({ reviewId }: { reviewId: string }) => {
  const [failed, setFailed] = useState(false);
  return (
    <Button
      onClick={() =>
        openReviewPdf(reviewId).then(
          () => setFailed(false),
          () => setFailed(true),
        )
      }
    >
      <FileText size={16} aria-hidden />
      {failed ? 'PDF 다시 받기' : 'PDF'}
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
    return <ErrorState title="발주 기록을 불러오지 못했어요" onRetry={() => refetch()} />;
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
    <div className={TABLE_CARD}>
      <table className={TABLE}>
        <thead>
          <tr>
            {['승인 시각', '부품', '수량', '공급사', '총액', '승인', ''].map((h, i) => (
              <th
                key={h || 'actions'}
                scope="col"
                className={`${TH} ${i === 2 || i === 4 ? 'text-right' : 'text-left'}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((po) => (
            <tr key={po.id} className={TR}>
              <td className={`${TD} text-text-secondary tabular-nums`}>
                {formatComputedAt(po.approved_at)}
              </td>
              <td className={TD}>
                {po.review_id ? (
                  <Link
                    href={`/reviews/${po.review_id}`}
                    className="flex flex-col text-label-md text-text-heading hover:text-text-brand"
                  >
                    {po.part.name}
                    {po.part.spec ? (
                      <span className="text-label-sm text-text-secondary">{po.part.spec}</span>
                    ) : null}
                  </Link>
                ) : (
                  <span className="text-label-md text-text-heading">{po.part.name}</span>
                )}
              </td>
              <td className={`${TD} text-right text-text-heading tabular-nums`}>
                {formatQty(po.qty, po.part.unit)}
              </td>
              <td className={`${TD} text-text-body`}>{po.supplier ?? EMPTY}</td>
              <td className={`${TD} text-right text-text-heading tabular-nums`}>
                {po.total === null ? EMPTY : formatWon(po.total)}
              </td>
              <td className={`${TD} text-text-body`}>
                {po.action ? `${APPROVAL_ACTIONS[po.action]} · ` : ''}
                {po.approved_by || EMPTY}
              </td>
              <td className={TD}>
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
                  ) : USES_BACKEND && po.review_id ? (
                    // 백엔드 PDF 는 로그인 토큰이 필요해 링크 대신 받아서 연다 (REV-07)
                    <PdfButton reviewId={po.review_id} />
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
