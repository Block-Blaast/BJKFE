import type { LucideIcon } from 'lucide-react';

// 동그란 아이콘 칩 (2026-11-05 개편, 참고: Boltshift). 참고처럼 연한 바탕이 아니라 꽉 찬 색을 쓴다.
// - onHero: 강조(그라데이션) 카드 위의 흰 원
// - inverse: 검정 원 — 한 화면의 대비 포인트
// - brand: 브랜드 파랑 원
// - gradient: 파랑 → 하늘 그라데이션 원 (장식이라 프리미티브 사용)
export type IconCircleTone = 'onHero' | 'inverse' | 'brand' | 'gradient';

const TONE_CLASS: Record<IconCircleTone, string> = {
  onHero: 'bg-bg-surface text-text-brand',
  inverse: 'bg-bg-inverse text-text-on-inverse',
  brand: 'bg-bg-brand text-text-on-brand',
  gradient: 'bg-bg-brand bg-linear-to-br from-brand-500 to-brand-300 text-text-on-brand',
};

type IconCircleProps = {
  icon: LucideIcon;
  tone: IconCircleTone;
};

const IconCircle = ({ icon: Icon, tone }: IconCircleProps) => (
  <span
    className={`flex size-11 shrink-0 items-center justify-center rounded-full ${TONE_CLASS[tone]}`}
  >
    <Icon size={20} aria-hidden />
  </span>
);

export default IconCircle;
