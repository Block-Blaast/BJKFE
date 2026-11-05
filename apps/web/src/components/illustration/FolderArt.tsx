import { useId } from 'react';

// 폴더 그림 (2026-11-05 — 참고: Kintsugi 폴더 카드). 뒤판 + 삐져나온 종이 두 장 + 탭 달린 앞판.
// 장식이라 프리미티브 색을 쓴다(design-system.md 원칙 1). 글씨는 FolderCard 가 앞판 위에 올린다.
// 앞판은 위에서 29% 지점(52/180)부터 시작한다 — FolderCard 의 글씨 위치가 이 값에 맞춰져 있다.

export type FolderTone = 'gray' | 'brand';

const COLORS: Record<
  FolderTone,
  { back: [string, string]; front: [string, string]; line: string }
> = {
  gray: {
    back: ['var(--color-gray-100)', 'var(--color-gray-200)'],
    front: ['var(--color-gray-50)', 'var(--color-gray-200)'],
    line: 'var(--color-gray-100)',
  },
  brand: {
    back: ['var(--color-brand-300)', 'var(--color-brand-400)'],
    front: ['var(--color-brand-100)', 'var(--color-brand-300)'],
    line: 'var(--color-brand-100)',
  },
};

const FRONT =
  'M0 64 Q0 52 12 52 H100 Q109 52 114 58 L121 66 Q125 70 133 70 H188 Q200 70 200 82 V156 Q200 180 176 180 H24 Q0 180 0 156 Z';

type FolderArtProps = {
  tone: FolderTone;
  className?: string;
};

const FolderArt = ({ tone, className }: FolderArtProps) => {
  const id = useId();
  const c = COLORS[tone];
  return (
    <svg viewBox="0 0 200 180" preserveAspectRatio="none" aria-hidden className={className}>
      <defs>
        <linearGradient id={`${id}-back`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.back[0]} />
          <stop offset="1" stopColor={c.back[1]} />
        </linearGradient>
        <linearGradient id={`${id}-front`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.front[0]} />
          <stop offset="1" stopColor={c.front[1]} />
        </linearGradient>
      </defs>
      <rect width="200" height="180" rx="24" fill={`url(#${id}-back)`} />
      <rect
        x="18"
        y="16"
        width="164"
        height="76"
        rx="8"
        fill="var(--color-gray-0)"
        opacity="0.7"
        transform="rotate(-3 100 54)"
      />
      <rect x="22" y="22" width="156" height="76" rx="8" fill="var(--color-gray-0)" />
      <rect x="36" y="36" width="72" height="5" rx="2.5" fill={c.line} />
      <rect x="36" y="47" width="104" height="5" rx="2.5" fill={c.line} />
      {/* 앞판 그림자 → 앞판 → 위쪽 흰 하이라이트 */}
      <path d={FRONT} transform="translate(0 -3)" fill="var(--color-gray-900)" opacity="0.05" />
      <path d={FRONT} fill={`url(#${id}-front)`} />
      <path
        d={FRONT}
        fill="none"
        stroke="var(--color-gray-0)"
        strokeOpacity="0.9"
        strokeWidth="1.5"
      />
    </svg>
  );
};

export default FolderArt;
