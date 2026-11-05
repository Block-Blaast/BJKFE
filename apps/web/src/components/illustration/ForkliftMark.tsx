type ForkliftMarkProps = {
  className?: string;
};

// 발주콕 로고 마크 — 지게차. 파비콘(app/icon.svg)과 같은 그림이라 하나를 고치면 다른 쪽도 함께 고친다.
// 파랑·노랑 두 색만 쓴다. 로고라 프리미티브 색을 쓰고(design-system 원칙 1의 예외), 옆에 이름 글자가 있어 화면 읽기에서는 숨긴다.
const ForkliftMark = ({ className }: ForkliftMarkProps) => (
  <svg viewBox="0 0 64 64" aria-hidden className={className}>
    <rect width="64" height="64" rx="32" className="fill-brand-600" />
    <polyline
      points="16,30 16,17 28,17 33,30"
      fill="none"
      strokeWidth="3.5"
      strokeLinejoin="round"
      strokeLinecap="round"
      className="stroke-gray-0"
    />
    <g className="fill-gray-0">
      <rect x="10" y="30" width="29" height="14" rx="2.5" />
      <rect x="38" y="11" width="4.5" height="35" rx="1.5" />
      <rect x="41" y="42" width="14" height="3.5" rx="1.5" />
    </g>
    <rect x="44" y="31" width="11" height="11" rx="1.5" className="fill-sub-500" />
    <g className="fill-gray-0 stroke-brand-600" strokeWidth="2">
      <circle cx="18" cy="47" r="5.5" />
      <circle cx="32" cy="47" r="5.5" />
    </g>
    <g className="fill-brand-600">
      <circle cx="18" cy="47" r="1.8" />
      <circle cx="32" cy="47" r="1.8" />
    </g>
  </svg>
);

export default ForkliftMark;
