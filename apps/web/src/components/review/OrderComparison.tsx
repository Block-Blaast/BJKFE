import type { OrderLine, Proposal } from '@bjk/api/types/review';

import { formatQty, formatWon } from '@/utils/format';
import { TABLE, TD, TH, TR } from '@/components/ui/table';

type OrderComparisonProps = {
  original: OrderLine;
  proposal: Proposal;
  unit: string;
  lossAvoided: number | null;
};

const EMPTY = '—';

// 원안 vs 수정안 (F-REVIEW-05). 바뀐 값은 브랜드 색으로 강조한다.
const OrderComparison = ({ original, proposal, unit, lossAvoided }: OrderComparisonProps) => {
  const rows = [
    {
      label: '수량',
      before: formatQty(original.qty, unit),
      after: proposal.qty === 0 ? '발주 안 함' : formatQty(proposal.qty, unit),
    },
    {
      label: '공급사',
      before: original.supplier ?? '요청 공급사',
      after: proposal.qty === 0 ? EMPTY : (proposal.supplier ?? '요청 공급사'),
    },
    {
      label: '단가',
      before: original.unit_price === null ? EMPTY : formatWon(original.unit_price),
      after: proposal.unit_price === null ? EMPTY : formatWon(proposal.unit_price),
    },
    {
      label: '총액',
      before: original.total === null ? EMPTY : formatWon(original.total),
      after: proposal.total === null ? EMPTY : formatWon(proposal.total),
    },
  ];

  const extraCost =
    original.total !== null && proposal.total !== null && proposal.total > original.total
      ? proposal.total - original.total
      : null;

  return (
    <div className="flex flex-col gap-3">
      <table className={`${TABLE} tabular-nums`}>
        <thead>
          <tr>
            <th scope="col" className={`${TH} text-left`}>
              <span className="sr-only">항목</span>
            </th>
            <th scope="col" className={`${TH} text-right`}>
              원안
            </th>
            <th scope="col" className={`${TH} text-right`}>
              수정안
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, before, after }) => (
            <tr key={label} className={TR}>
              <th scope="row" className={`${TD} text-left font-normal text-text-secondary`}>
                {label}
              </th>
              <td className={`${TD} text-right text-text-body`}>{before}</td>
              <td
                className={`${TD} text-right ${before === after ? 'text-text-body' : 'text-label-md text-text-brand'}`}
              >
                {after}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {proposal.saving ? (
        <p className="text-label-md text-text-success tabular-nums">
          {formatWon(proposal.saving)} 절감
        </p>
      ) : null}
      {extraCost !== null ? (
        <p className="text-body-sm text-text-body tabular-nums">
          추가 비용 {formatWon(extraCost)}
          {lossAvoided ? `, 피하는 예상 손실 ${formatWon(lossAvoided)}` : ''}
        </p>
      ) : null}
    </div>
  );
};

export default OrderComparison;
