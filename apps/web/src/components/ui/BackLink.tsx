import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

type BackLinkProps = {
  href: string;
  label: string;
};

// 동그란 뒤로 가기 버튼 + 상위 화면 이름. 터치 대상 44px.
const BackLink = ({ href, label }: BackLinkProps) => (
  <Link
    href={href}
    className="group flex w-fit items-center gap-2 text-label-md text-text-secondary hover:text-text-heading"
  >
    <span className="flex size-11 items-center justify-center rounded-full bg-bg-surface shadow-card group-hover:bg-bg-brand-subtle group-hover:text-text-brand">
      <ChevronLeft size={20} aria-hidden />
    </span>
    {label}
  </Link>
);

export default BackLink;
