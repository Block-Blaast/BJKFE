import { useId } from 'react';

type SpotlightIllustrationProps = {
  className?: string;
  // found: 콕 짚은 상자에 체크 (기본) / lost: 빛이 빈자리를 비춘다 — 불러오기 실패 화면용
  variant?: 'found' | 'lost';
};

// 브랜드 일러스트 — 발주콕 과녁이 창고 부품 상자를 "콕 짚어" 비추는 빛.
// 파랑·노랑 두 색만 쓴다. 장식이라 프리미티브 색을 쓰고(design-system 원칙 1의 예외), 화면 읽기에서는 숨긴다.
// 빈 화면·오류 화면·로그인·브리핑 머리처럼 브랜드가 보이는 순간에만 쓴다 (design-system.md "화면 인상").
const SpotlightIllustration = ({ className, variant = 'found' }: SpotlightIllustrationProps) => {
  const beamId = useId();
  const lost = variant === 'lost';

  return (
    <svg viewBox="0 0 240 180" aria-hidden className={className}>
      <defs>
        <linearGradient id={beamId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.9" className="text-sub-500" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" className="text-sub-500" />
        </linearGradient>
      </defs>

      {/* 빛 — 못 찾았을 때는 옆으로 빗나간다 */}
      <polygon
        points="104,44 136,44 214,176 26,176"
        fill={`url(#${beamId})`}
        transform={lost ? 'rotate(14 120 30)' : undefined}
      />

      {/* 빛 안의 부품 상자 — 아래로 갈수록 흐려진다 */}
      <g className="fill-sub-300">
        {lost ? null : <rect x="96" y="70" width="48" height="36" rx="8" />}
        <rect x="64" y="118" width="44" height="32" rx="8" opacity="0.6" />
        <rect x="132" y="118" width="44" height="32" rx="8" opacity="0.6" />
      </g>
      {lost ? (
        // 비어 있는 자리 + 물음표
        <g>
          <rect
            x="96"
            y="70"
            width="48"
            height="36"
            rx="8"
            fill="none"
            strokeWidth="3"
            strokeDasharray="6 5"
            className="stroke-sub-600"
          />
          <path
            d="M114 82 q0 -6 6 -6 q6 0 6 6 q0 4 -6 6 v3"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-brand-700"
          />
          <circle cx="120" cy="99" r="2.5" className="fill-brand-700" />
        </g>
      ) : (
        <>
          {/* 콕 짚은 상자 하나 */}
          <rect x="96" y="70" width="48" height="36" rx="8" className="fill-sub-500" />
          <path
            d="M110 88 l7 7 l13 -14"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-brand-700"
          />
        </>
      )}

      {/* 과녁 */}
      <g transform={lost ? 'rotate(14 120 30)' : undefined}>
        <circle cx="120" cy="30" r="24" className="fill-brand-600" />
        <circle cx="120" cy="30" r="15" className="fill-gray-0" />
        <circle cx="120" cy="30" r="7" className="fill-brand-600" />
      </g>
    </svg>
  );
};

export default SpotlightIllustration;
