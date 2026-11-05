import { formatAnalyzedAt, formatComputedAt } from '@/utils/format';

type ComputedAtProps = {
  at: string;
  // 연도까지 보여주고 "분석 기준"으로 적는다 — 해를 넘기는 날짜와 같이 볼 때
  full?: boolean;
  className?: string;
};

// 숫자 옆에 붙이는 계산 기준 시각. 새벽 배치 값인지 방금 값인지 사용자가 알 수 있게 한다.
const ComputedAt = ({ at, full = false, className }: ComputedAtProps) => {
  return (
    <time
      dateTime={at}
      className={`text-label-sm text-text-secondary tabular-nums ${className ?? ''}`}
    >
      {full ? `${formatAnalyzedAt(at)} 분석 기준` : `${formatComputedAt(at)} 기준`}
    </time>
  );
};

export default ComputedAt;
