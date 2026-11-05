import type { Metadata } from 'next';
import { Suspense } from 'react';

import AuditBoard from '@/components/desk/AuditBoard';

export const metadata: Metadata = { title: '재고 맞춰보기' };

// TODO(W-06): SSE(audit.flagged)로 실시간 갱신. 실사 응답(F-CHAT-05)이 들어오면 항목이 닫힌다.
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
      <Suspense fallback={<p className="text-body-md text-text-secondary">불러오는 중이에요…</p>}>
        <AuditBoard />
      </Suspense>
    </div>
  );
};

export default AuditPage;
