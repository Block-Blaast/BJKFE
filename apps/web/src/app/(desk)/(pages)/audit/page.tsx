import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SkeletonPage } from '@/components/ui/feedback/Skeleton';
import AuditBoard from '@/components/desk/AuditBoard';

export const metadata: Metadata = { title: '재고 맞춰보기' };

// 실시간 갱신은 providers/realtime-sync 가 한다. TODO(W-06): 백엔드가 audit.flagged 를 아직 발행하지 않는다.
const AuditPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-heading">재고 맞춰보기</h1>
        <p className="text-body-md text-text-secondary">
          재고 기록을 정비 기록·사용량과 비교해, 한 번 세어 보면 좋을 부품을 골랐어요. 확인을
          요청하면 담당 작업자에게 채팅으로 물어봐요.
        </p>
      </header>
      {/* useSearchParams 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents) */}
      <Suspense fallback={<SkeletonPage label="화면을 불러오는 중" />}>
        <AuditBoard />
      </Suspense>
    </div>
  );
};

export default AuditPage;
