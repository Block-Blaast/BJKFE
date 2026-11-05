// 3D 창고(W-11) 데이터를 받기 전 — 회색 지게차 실루엣. 포크가 상자를 들었다 내리고, 바닥선이 흘러 앞으로 달리는 것처럼 보인다.
// 실루엣 전체에 한 그라데이션을 칠하고 그 색 띠가 왼쪽 → 오른쪽으로 번지게 해 다른 스켈레톤과 같은 빛 효과를 낸다.
// 움직임은 모두 globals.css 의 .forklift-* (움직임 줄이기면 멈춤). 데이터가 오면 3D 인트로가 이어받는다.
const SHINE = 'forklift-skeleton-shine';
const FILL = `url(#${SHINE})`;

const Wheel = ({ cx }: { cx: number }) => (
  <g>
    <circle cx={cx} cy={57} r={7.5} fill={FILL} />
    <circle cx={cx} cy={57} r={3.2} className="fill-gray-0" />
    <g className="forklift-wheel">
      <line
        x1={cx - 3.2}
        y1={57}
        x2={cx + 3.2}
        y2={57}
        strokeWidth={1.4}
        className="stroke-gray-200"
      />
      <line x1={cx} y1={53.8} x2={cx} y2={60.2} strokeWidth={1.4} className="stroke-gray-200" />
    </g>
  </g>
);

const WarehouseSkeleton = () => (
  <div
    role="status"
    aria-busy
    className="m-auto flex w-full max-w-xs flex-col items-center gap-4 rounded-xl bg-bg-surface p-8 shadow-card"
  >
    <span className="sr-only">창고를 불러오는 중</span>
    <svg viewBox="0 0 120 72" aria-hidden className="w-48">
      <defs>
        <linearGradient id={SHINE} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="120" y2="0">
          <stop offset="0" className="forklift-shine" />
          <stop offset="0.25" className="forklift-shine" />
          <stop offset="0.5" className="forklift-shine" />
          <stop offset="0.75" className="forklift-shine" />
          <stop offset="1" className="forklift-shine" />
        </linearGradient>
      </defs>

      {/* 흐르는 바닥선 — 지게차는 제자리인데 바닥이 뒤로 가서 달리는 것처럼 보인다 */}
      <line
        x1="0"
        y1="66"
        x2="120"
        y2="66"
        strokeWidth="2"
        strokeLinecap="round"
        className="forklift-floor stroke-gray-200"
      />

      <g className="forklift-body">
        <polyline
          points="24,36 24,19 40,19 47,36"
          fill="none"
          stroke={FILL}
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <rect x="14" y="35" width="42" height="18" rx="4" fill={FILL} />
        <rect x="55" y="10" width="5.5" height="46" rx="2" fill={FILL} />
        <Wheel cx={27} />
        <Wheel cx={46} />
      </g>

      <g className="forklift-forks">
        <rect x="59" y="52" width="22" height="4" rx="1.5" fill={FILL} />
        <rect x="63" y="35" width="17" height="16" rx="2.5" fill={FILL} />
        <line x1="63" y1="43" x2="80" y2="43" strokeWidth="1.2" className="stroke-gray-0" />
      </g>
    </svg>
  </div>
);

export default WarehouseSkeleton;
