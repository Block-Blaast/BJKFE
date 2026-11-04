import type { Metadata } from 'next';
import { Suspense } from 'react';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '초대 수락' };

const ELEMENTS = [
  '초대 토큰 확인 (일회용, 72시간)',
  '이름, PIN 4자리 등록 (확인 입력 포함)',
  '회사 코드를 기기에 저장',
  "만료·사용된 초대: '사장님께 새 QR을 요청하세요'",
];

// params 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents).
const TargetId = async ({ params }: { params: PageProps<'/invite/[token]'>['params'] }) => {
  const { token } = await params;
  return <span className="text-label-md text-text-body">대상 ID: {token}</span>;
};

const InvitePage = ({ params }: PageProps<'/invite/[token]'>) => {
  return (
    <PagePlaceholder
      specId="F-AUTH-02"
      title="초대 수락"
      description="사장님이 보낸 초대 QR 로 들어와 이름과 PIN 을 등록해요."
      elements={ELEMENTS}
    >
      <Suspense fallback={null}>
        <TargetId params={params} />
      </Suspense>
    </PagePlaceholder>
  );
};

export default InvitePage;
