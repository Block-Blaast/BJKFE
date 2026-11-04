'use client';

import dynamic from 'next/dynamic';
import { useState, type ReactNode } from 'react';

// 개발 모드에서 백엔드 주소(NEXT_PUBLIC_API_URL)가 없으면 MSW 목업으로 API 를 대신한다.
const SHOULD_MOCK = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL;

// - ssr: false — msw/browser 는 서버 번들에서 해석되지 않는다 (MockWorker 주석 참고).
// - 삼항 안에 둔다 — 프로덕션에서는 SHOULD_MOCK 이 false 로 고정돼 import 가 통째로 지워지고 msw 청크가 생기지 않는다.
const MockWorker = SHOULD_MOCK
  ? dynamic(() => import('@/mocks/MockWorker'), { ssr: false })
  : () => null;

type MockProviderProps = {
  children: ReactNode;
};

const MockProvider = ({ children }: MockProviderProps) => {
  const [ready, setReady] = useState(!SHOULD_MOCK);

  // 워커가 뜨기 전에 보낸 요청은 목업을 거치지 않으므로, 준비될 때까지 화면을 그리지 않는다.
  if (!ready) return <MockWorker onReady={() => setReady(true)} />;
  return children;
};

export default MockProvider;
