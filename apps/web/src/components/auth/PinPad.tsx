'use client';

import { Delete } from 'lucide-react';
import { useEffect } from 'react';

type PinPadProps = {
  value: string;
  onChange: (value: string) => void;
  // 마지막 자리를 누르는 순간 호출한다 — 확인 버튼 없이 바로 제출
  onComplete: (value: string) => void;
  label: string;
  disabled?: boolean;
  error?: string | null;
  length?: number;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;

// PIN 키패드 (M-01). 장갑 낀 손가락으로도 누를 수 있게 키를 크게(64px) 만든다.
const PinPad = ({
  value,
  onChange,
  onComplete,
  label,
  disabled = false,
  error,
  length = 4,
}: PinPadProps) => {
  const press = (key: string) => {
    if (disabled) return;
    if (key === 'back') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= length) return;
    const next = value + key;
    onChange(next);
    if (next.length === length) onComplete(next);
  };

  // PC 에서는 키보드 숫자·백스페이스도 받는다
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) press(event.key);
      else if (event.key === 'Backspace') press('back');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <span className="text-label-lg text-text-heading">{label}</span>
        <div
          className="flex gap-4"
          role="img"
          aria-label={`${length}자리 중 ${value.length}자리 입력됨`}
        >
          {Array.from({ length }, (_, i) => (
            <span
              key={i}
              className={`size-4 rounded-full border-2 ${i < value.length ? 'border-border-brand bg-bg-brand' : 'border-border-strong bg-bg-surface'}`}
            />
          ))}
        </div>
        <p role="alert" className="min-h-5 text-body-sm text-text-danger">
          {error ?? ''}
        </p>
      </div>

      <div className="grid w-full grid-cols-3 gap-2">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} aria-hidden />
          ) : (
            <button
              key={key}
              type="button"
              disabled={disabled}
              aria-label={key === 'back' ? '지우기' : key}
              onClick={() => press(key)}
              className="flex h-16 items-center justify-center rounded-full bg-bg-surface text-h2 text-text-heading tabular-nums shadow-card active:bg-bg-subtle disabled:text-text-disabled"
            >
              {key === 'back' ? <Delete size={24} aria-hidden /> : key}
            </button>
          ),
        )}
      </div>
    </div>
  );
};

export default PinPad;
