import Link from 'next/link';
import type { ReactNode } from 'react';

import FolderArt from '@/components/illustration/FolderArt';

type FolderCardProps = {
  title: string;
  count: ReactNode; // 제목 아래 한 줄 (예: "부품 6개")
  foot?: ReactNode; // 맨 아래 작은 글씨
  selected?: boolean;
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never });

// 폴더 카드 (참고: Kintsugi). 묶음을 고르는 큰 버튼 — 부품 카테고리, 기준 정보·리포트 종류.
// 선택된 폴더만 파랑. 글씨는 앞판(위 29%부터) 위에만 둔다.
const FolderCard = ({ title, count, foot, selected = false, href, onClick }: FolderCardProps) => {
  const body = (
    <>
      <FolderArt
        tone={selected ? 'brand' : 'gray'}
        className="absolute inset-0 size-full transition-transform duration-200 group-hover:-translate-y-1"
      />
      <span className="absolute inset-x-0 top-2/5 bottom-0 flex flex-col p-5 text-left">
        <span className="truncate text-h3 text-text-heading">{title}</span>
        <span className="text-body-md text-text-body tabular-nums">{count}</span>
        {foot ? (
          // 파란 앞판(brand-300) 위에서는 회색 글씨 대비가 모자라 본문색을 쓴다
          <span
            className={`mt-auto truncate text-label-sm ${selected ? 'text-text-body' : 'text-text-secondary'}`}
          >
            {foot}
          </span>
        ) : null}
      </span>
    </>
  );
  const className = `group relative block aspect-10/9 w-full rounded-xl shadow-card outline-none transition-shadow hover:shadow-raised focus-visible:ring-2 focus-visible:ring-border-brand ${selected ? 'shadow-raised' : ''}`;

  return href ? (
    <Link href={href} className={className} aria-current={selected ? 'true' : undefined}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className} aria-pressed={selected}>
      {body}
    </button>
  );
};

export default FolderCard;
