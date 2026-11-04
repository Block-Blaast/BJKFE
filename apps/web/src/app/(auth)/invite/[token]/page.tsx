import type { Metadata } from 'next';
import { Suspense } from 'react';

import InviteView from '@/components/auth/InviteView';

export const metadata: Metadata = { title: '초대 수락' };

// params 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents).
const InviteBody = async ({ params }: { params: PageProps<'/invite/[token]'>['params'] }) => {
  const { token } = await params;
  return <InviteView token={token} />;
};

const InvitePage = ({ params }: PageProps<'/invite/[token]'>) => {
  return (
    <Suspense fallback={null}>
      <InviteBody params={params} />
    </Suspense>
  );
};

export default InvitePage;
