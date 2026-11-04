import { Check, CircleHelp, CircleMinus, TriangleAlert, type LucideIcon } from 'lucide-react';

export type OrderStatus = 'approve' | 'missed' | 'unneeded' | 'check';

type StatusChipProps = {
  status: OrderStatus;
  className?: string;
};

// 흑백 인쇄에서도 구분되도록 색·아이콘·라벨을 항상 함께 보여준다.
const STATUS: Record<
  OrderStatus,
  { label: string; Icon: LucideIcon; chipClass: string; iconClass: string }
> = {
  approve: {
    label: '승인 필요',
    Icon: Check,
    chipClass: 'bg-bg-brand-subtle text-text-brand',
    iconClass: 'text-icon-brand',
  },
  missed: {
    label: '놓친 발주',
    Icon: TriangleAlert,
    chipClass: 'bg-bg-danger-subtle text-text-danger',
    iconClass: 'text-icon-danger',
  },
  unneeded: {
    label: '발주 불필요',
    Icon: CircleMinus,
    chipClass: 'bg-bg-success-subtle text-text-success',
    iconClass: 'text-icon-success',
  },
  check: {
    label: '확인 요청',
    Icon: CircleHelp,
    chipClass: 'bg-bg-warning-subtle text-text-warning',
    iconClass: 'text-icon-warning',
  },
};

const StatusChip = ({ status, className }: StatusChipProps) => {
  const { label, Icon, chipClass, iconClass } = STATUS[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-label-sm ${chipClass} ${className ?? ''}`}
    >
      <Icon size={14} aria-hidden className={`shrink-0 ${iconClass}`} />
      {label}
    </span>
  );
};

export default StatusChip;
