'use client';

type SegmentedProps<T extends string> = {
  label: string; // 화면 읽기용 묶음 이름
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
  fill?: boolean; // 너비를 가득 채울지 (폰·로그인)
};

// 알약 묶음 선택 — 선택된 항목은 검정 알약 (상단 내비와 같은 규칙, design-system.md "화면 인상")
const Segmented = <T extends string>({
  label,
  options,
  value,
  onChange,
  fill,
}: SegmentedProps<T>) => {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex gap-1 rounded-full bg-bg-surface p-1 shadow-card ${fill ? 'w-full' : 'w-fit'}`}
    >
      {options.map(([option, text]) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`h-10 rounded-full px-5 text-label-md transition-colors ${fill ? 'flex-1' : ''} ${value === option ? 'bg-bg-inverse text-text-on-inverse' : 'text-text-secondary hover:bg-bg-page'}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
};

export default Segmented;
