import ErrorState from '@/components/ui/ErrorState';

type QueryStatusProps = {
  isPending: boolean;
  isError: boolean;
  what: string; // "설비 목록" — 문구에 들어간다
  onRetry: () => void;
};

// 목록 카드들의 로딩·에러 줄. 데이터가 있으면 아무것도 그리지 않는다.
const QueryStatus = ({ isPending, isError, what, onRetry }: QueryStatusProps) => {
  if (isPending)
    return <p className="text-body-sm text-text-secondary">{what}을 불러오는 중이에요…</p>;
  if (!isError) return null;
  return <ErrorState title={`${what}을 불러오지 못했어요`} onRetry={onRetry} size="inline" />;
};

export default QueryStatus;
