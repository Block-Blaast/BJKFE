import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// 임시 — Figma 에 판정·등급 배지 디자인이 아직 없어 Status Chip 규격(px-3 py-1, label-sm, 아이콘 14px)을 따랐다.
// 디자인이 나오면 @bjk/ui 로 옮기고 교체한다.
export type TagTone = 'brand' | 'danger' | 'success' | 'warning' | 'neutral';

const TONE_CLASS: Record<TagTone, { chip: string; icon: string }> = {
  brand: { chip: 'bg-bg-brand-subtle text-text-brand', icon: 'text-icon-brand' },
  danger: { chip: 'bg-bg-danger-subtle text-text-danger', icon: 'text-icon-danger' },
  success: { chip: 'bg-bg-success-subtle text-text-success', icon: 'text-icon-success' },
  warning: { chip: 'bg-bg-warning-subtle text-text-warning', icon: 'text-icon-warning' },
  neutral: { chip: 'bg-bg-subtle text-text-body', icon: 'text-text-secondary' },
};

type TagProps = {
  tone: TagTone;
  // 흑백 인쇄에서도 구분되도록 아이콘과 라벨을 함께 쓴다 (디자인 원칙 9)
  icon: LucideIcon;
  children: ReactNode;
};

const Tag = ({ tone, icon: Icon, children }: TagProps) => {
  const { chip, icon } = TONE_CLASS[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-label-sm whitespace-nowrap ${chip}`}
    >
      <Icon size={14} aria-hidden className={`shrink-0 ${icon}`} />
      {children}
    </span>
  );
};

export default Tag;
