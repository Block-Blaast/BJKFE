import type { ReactNode } from 'react';

import SpotlightIllustration from '@/components/illustration/SpotlightIllustration';

type EmptyStateProps = {
  title: string;
  children?: ReactNode;
};

// 빈 화면 — 브랜드 일러스트가 나오는 순간 중 하나 (design-system.md "위트는 브랜드 순간에만")
const EmptyState = ({ title, children }: EmptyStateProps) => (
  <div className="flex flex-col items-center gap-3 rounded-xl bg-bg-surface px-6 py-12 text-center shadow-card">
    <SpotlightIllustration className="h-24 w-auto" />
    <p className="text-h3 text-text-heading">{title}</p>
    {children ? <div className="text-body-md text-text-secondary">{children}</div> : null}
  </div>
);

export default EmptyState;
