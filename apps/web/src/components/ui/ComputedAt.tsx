import { formatComputedAt } from '@/utils/format';

type ComputedAtProps = {
  at: string;
  className?: string;
};

// 숫자 옆에 붙이는 계산 기준 시각. 새벽 배치 값인지 방금 값인지 사용자가 알 수 있게 한다.
const ComputedAt = ({ at, className }: ComputedAtProps) => {
  return (
    <time
      dateTime={at}
      className={`text-label-sm text-text-secondary tabular-nums ${className ?? ''}`}
    >
      {formatComputedAt(at)} 기준
    </time>
  );
};

export default ComputedAt;
