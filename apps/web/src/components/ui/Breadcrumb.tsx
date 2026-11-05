import { ArrowLeft, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import Link from 'next/link';

import { NAV_BACK } from '@/constants/transitions';

type BreadcrumbProps = {
  parent: { href: string; label: string };
  current: string;
};

// 상세 화면 맨 위 길잡이 (참고: Kintsugi). 뒤로 가기 원 | 상위 폴더 › 지금 화면.
const Breadcrumb = ({ parent, current }: BreadcrumbProps) => (
  <nav aria-label="현재 위치" className="flex items-center gap-3 text-label-md">
    <Link
      href={parent.href}
      transitionTypes={NAV_BACK}
      aria-label={`${parent.label}(으)로 돌아가기`}
      className="flex size-10 items-center justify-center rounded-full bg-bg-surface text-text-secondary shadow-card hover:bg-bg-brand-subtle hover:text-text-brand"
    >
      <ArrowLeft size={18} aria-hidden />
    </Link>
    <span aria-hidden className="h-5 w-px bg-border-strong" />
    <ol className="flex min-w-0 items-center gap-2">
      <li>
        <Link
          href={parent.href}
          transitionTypes={NAV_BACK}
          className="flex items-center gap-2 text-text-secondary hover:text-text-heading"
        >
          <Folder size={16} aria-hidden />
          {parent.label}
        </Link>
      </li>
      <li aria-hidden className="text-text-secondary">
        <ChevronRight size={14} />
      </li>
      <li aria-current="page" className="flex min-w-0 items-center gap-2 text-text-heading">
        <FolderOpen size={16} aria-hidden className="shrink-0 text-icon-brand" />
        <span className="truncate">{current}</span>
      </li>
    </ol>
  </nav>
);

export default Breadcrumb;
