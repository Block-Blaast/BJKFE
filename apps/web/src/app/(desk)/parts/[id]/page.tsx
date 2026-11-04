import { ChevronLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import PartDetail from '@/components/desk/PartDetail';

export const metadata: Metadata = { title: '부품 상세' };

// params 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents).
const PartBody = async ({ params }: { params: PageProps<'/parts/[id]'>['params'] }) => {
  const { id } = await params;
  return <PartDetail id={id} />;
};

const PartDetailPage = ({ params }: PageProps<'/parts/[id]'>) => {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/parts"
        className="flex w-fit items-center gap-1 text-label-md text-text-secondary hover:text-text-heading"
      >
        <ChevronLeft size={18} aria-hidden />
        부품
      </Link>
      <Suspense fallback={null}>
        <PartBody params={params} />
      </Suspense>
    </div>
  );
};

export default PartDetailPage;
