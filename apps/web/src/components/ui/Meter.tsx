type MeterProps = {
  label: string; // 화면 읽기용 (예: "기간 필요량 대비 현재 재고")
  ratio: number; // 0~1 밖의 값은 잘라 그린다
  tone: 'brand' | 'danger';
};

// 얇은 진행 막대 (참고: Kintsugi Info 패널). 숫자는 막대 위 글씨로 함께 보여주고, 막대는 보조다.
const Meter = ({ label, ratio, tone }: MeterProps) => {
  const value = Math.min(1, Math.max(0, ratio));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className="h-2 w-full overflow-hidden rounded-full bg-bg-subtle"
    >
      <div
        className={`h-full rounded-full ${tone === 'danger' ? 'bg-border-danger' : 'bg-bg-brand bg-linear-to-r from-brand-300 to-brand-600'}`}
        // 막대 길이는 데이터로 정해지는 런타임 값이라 인라인 스타일을 쓴다 (design-system.md)
        style={{ width: `${value * 100}%` }}
      />
    </div>
  );
};

export default Meter;
