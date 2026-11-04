'use client';

import type { ReactNode } from 'react';

import { setRequestGate } from '@bjk/api/client';

// 개발 모드에서 백엔드 주소(NEXT_PUBLIC_API_URL)가 없으면 MSW 목업으로 API 를 대신한다.
const SHOULD_MOCK = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL;

// 화면은 바로 그리고, API 요청만 워커가 뜰 때까지 기다리게 한다.
// (화면 렌더링을 막으면 서버가 아무것도 그리지 못해 Next 의 instant 검증이 에러를 낸다)
// - typeof window: 서버 번들에서는 이 분기가 지워져 msw/browser 를 해석하지 않는다(node: null).
// - SHOULD_MOCK: 프로덕션에서는 false 로 고정돼 msw 청크가 생기지 않는다.
if (SHOULD_MOCK && typeof window !== 'undefined') {
  setRequestGate(
    import('@/mocks/browser').then(({ worker }) =>
      worker.start({ onUnhandledFrame: 'bypass', quiet: true }),
    ),
  );
}

type MockProviderProps = {
  children: ReactNode;
};

const MockProvider = ({ children }: MockProviderProps) => children;

export default MockProvider;
