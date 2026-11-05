'use client';

import {
  Ban,
  Check,
  CircleCheck,
  Clock,
  Copy,
  FileText,
  PackageCheck,
  PhoneOutgoing,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { getPurchaseOrderMessage, PURCHASE_ORDER_STATUS } from '@bjk/api/reports';
import { openReviewPdf } from '@bjk/api/reviews';
import type { PurchaseOrder, PurchaseOrderStatus } from '@bjk/api/types/report';
import Button from '@bjk/ui/components/Button';

import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import Tag, { type TagTone } from '@/components/ui/Tag';
import {
  useCancelPurchaseOrder,
  useMarkPurchaseOrderOrdered,
  usePurchaseOrders,
} from '@/hooks/report/useReports';
import { apiErrorMessage } from '@/utils/apiError';
import { formatComputedAt, formatNumber, formatWon } from '@/utils/format';
import { TABLE, TABLE_CARD, TD, TH, TR } from '@/components/ui/table';

const STATUS_TAG: Record<PurchaseOrderStatus, { tone: TagTone; icon: LucideIcon }> = {
  approved: { tone: 'warning', icon: Clock },
  ordered: { tone: 'brand', icon: Truck },
  partially_received: { tone: 'brand', icon: PackageCheck },
  received: { tone: 'success', icon: CircleCheck },
  cancelled: { tone: 'neutral', icon: Ban },
};

// 공급사에 보낼 문자 문구는 서버가 만든다 (F-APPROVAL-03, PO-02). 자동 전송은 범위 밖이라 복사만 한다.
const CopyButton = ({ id }: { id: string }) => {
  const [state, setState] = useState<'idle' | 'loading' | 'copied' | 'failed'>('idle');
  return (
    <Button
      variant="secondary"
      disabled={state === 'loading'}
      onClick={() => {
        setState('loading');
        getPurchaseOrderMessage(id)
          .then((message) => navigator.clipboard.writeText(message))
          .then(
            () => setState('copied'),
            () => setState('failed'),
          );
      }}
    >
      {state === 'copied' ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      {state === 'copied' ? '복사했어요' : state === 'failed' ? '복사 실패' : '발주 문구 복사'}
    </Button>
  );
};

// 결재용 PDF 는 검토 단위다(REV-07). 로그인 토큰이 필요해 링크 대신 받아서 연다
const PdfButton = ({ reviewId }: { reviewId: string | null }) => {
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle');
  if (!reviewId) {
    return (
      <Button disabled title="검토 없이 들어온 발주라 결재용 PDF가 없어요">
        <FileText size={16} aria-hidden />
        PDF 없음
      </Button>
    );
  }
  return (
    <Button
      disabled={state === 'loading'}
      title={state === 'failed' ? 'PDF를 열지 못했어요. 만드는 중일 수 있어요.' : undefined}
      onClick={() => {
        setState('loading');
        openReviewPdf(reviewId).then(
          () => setState('idle'),
          () => setState('failed'),
        );
      }}
    >
      <FileText size={16} aria-hidden />
      {state === 'loading' ? '여는 중…' : state === 'failed' ? 'PDF 다시 열기' : 'PDF'}
    </Button>
  );
};

// 주문 완료 표시·취소는 승인 상태(주문 전)에서만 된다 (PO-03·04)
const OrderActions = ({ po }: { po: PurchaseOrder }) => {
  const mark = useMarkPurchaseOrderOrdered();
  const cancel = useCancelPurchaseOrder();
  const [asking, setAsking] = useState(false);
  const busy = mark.isPending || cancel.isPending;
  const error = mark.error ?? cancel.error;

  return (
    <div className="flex flex-col items-end gap-2">
      {asking ? (
        <div className="flex items-center gap-2">
          <span className="text-label-sm text-text-body">이 발주를 취소할까요?</span>
          <Button variant="ghost" disabled={busy} onClick={() => setAsking(false)}>
            아니요
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => cancel.mutate(po.id)}>
            {cancel.isPending ? '취소 중…' : '발주 취소'}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => mark.mutate(po.id)}>
            <PhoneOutgoing size={16} aria-hidden />
            {mark.isPending ? '표시 중…' : '발주 완료 표시'}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setAsking(true)}>
            취소
          </Button>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-body-sm text-text-danger">
          {apiErrorMessage(error, '처리하지 못했어요.')}
        </p>
      ) : null}
    </div>
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
            {['승인 시각', '부품', '수량', '공급사', '총액', '상태', ''].map((h, i) => (
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
          {orders.map((po) => {
            const tag = STATUS_TAG[po.status];
            return (
              <tr key={po.id} className={`${TR} align-top`}>
                <td className={`${TD} text-text-secondary tabular-nums`}>
                  {formatComputedAt(po.approved_at)}
                  {po.approved_by ? (
                    <span className="block text-label-sm">{po.approved_by}</span>
                  ) : null}
                </td>
                <td className={TD}>
                  {po.review_id ? (
                    <Link
                      href={`/reviews/${po.review_id}`}
                      className="text-label-md text-text-heading hover:text-text-brand"
                    >
                      {po.part.name}
                    </Link>
                  ) : (
                    <span className="text-label-md text-text-heading">{po.part.name}</span>
                  )}
                </td>
                <td className={`${TD} text-right text-text-heading tabular-nums`}>
                  {formatNumber(po.qty)}
                  {po.status === 'partially_received' ? (
                    <span className="block text-label-sm text-text-secondary">
                      입고 {formatNumber(po.received_qty)}
                    </span>
                  ) : null}
                </td>
                <td className={`${TD} text-text-body`}>{po.supplier}</td>
                <td className={`${TD} text-right text-text-heading tabular-nums`}>
                  {formatWon(po.total)}
                </td>
                <td className={TD}>
                  <span className="flex flex-col items-start gap-1">
                    <Tag tone={tag.tone} icon={tag.icon}>
                      {PURCHASE_ORDER_STATUS[po.status]}
                    </Tag>
                    {po.ordered_at ? (
                      <span className="text-label-sm text-text-secondary tabular-nums">
                        주문 {formatComputedAt(po.ordered_at)}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className={TD}>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex justify-end gap-2">
                      <CopyButton id={po.id} />
                      <PdfButton reviewId={po.review_id} />
                    </div>
                    {po.status === 'approved' ? <OrderActions po={po} /> : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PurchaseOrderList;
