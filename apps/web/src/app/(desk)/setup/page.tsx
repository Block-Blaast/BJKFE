import type { Metadata } from 'next';
import { Suspense } from 'react';

import SetupView from '@/components/desk/setup/SetupView';

export const metadata: Metadata = { title: '기준 정보' };

// 기준 정보 (W-08). TODO(auth): 관리자·사장님만 들어올 수 있게 막는다 (F-AUTH-03).
const SetupPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-heading">기준 정보</h1>
        <p className="text-body-md text-text-secondary">
          발주콕이 계산할 수 있게 공장의 기본 정보를 넣어요. 비어 있는 값은 기본값으로 시작해 쓸수록
          정확해져요.
        </p>
      </header>
      {/* useSearchParams 는 요청 시점 값이라 Suspense 안에서 읽는다 (cacheComponents) */}
      <Suspense fallback={<p className="text-body-md text-text-secondary">불러오는 중이에요…</p>}>
        <SetupView />
      </Suspense>
    </div>
  );
};

export default SetupPage;
