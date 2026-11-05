type PendingReviewBadgeProps = {
  count: number | null;
};

// 결정 대기 건수 배지 — 숫자는 흐름 띠가 이미 받은 검토 목록에서 센다(요청을 따로 보내지 않는다)
const PendingReviewBadge = ({ count }: PendingReviewBadgeProps) => {
  if (!count) return null;
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-brand px-1 text-label-sm text-text-on-brand tabular-nums">
      <span className="sr-only">결정 대기 </span>
      {count}
    </span>
  );
};

export default PendingReviewBadge;
