'use client';

import { CircleHelp } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

type HelpTipProps = {
  // 무엇에 대한 설명인지 — 스크린 리더가 "<label> 설명"으로 읽는다
  label: string;
  children: ReactNode;
};

// 라벨 옆 (?) 도움말. 마우스를 올리거나, 누르거나, 키보드로 초점을 주면 열린다.
// 터치 화면에는 hover 가 없어 누르기로도 열리게 했다.
const HelpTip = ({ label, children }: HelpTipProps) => {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`${label} 설명`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        className="flex size-5 items-center justify-center rounded-full text-text-secondary hover:text-text-heading focus-visible:outline-2 focus-visible:outline-border-brand"
      >
        <CircleHelp size={16} aria-hidden />
      </button>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className="absolute top-full left-0 z-10 mt-2 flex w-72 flex-col gap-2 rounded-md bg-bg-inverse p-3 text-body-sm text-text-on-inverse shadow-raised"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
};

export default HelpTip;
