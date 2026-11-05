'use client';

import type { ReactNode } from 'react';

import { setRequestGate } from '@bjk/api/client';

// MSW 목업으로 API 를 대신하는 조건.
// - 개발 모드에서 백엔드 주소(NEXT_PUBLIC_API_URL)가 없을 때
// - NEXT_PUBLIC_USE_MOCKS=1 로 빌드했을 때 — 백엔드가 아직 없는 시연 서버(W-11 3D 창고 등)용. production 빌드에서도 켜진다.
// process.env 를 식 안에 그대로 써야 빌드 때 상수로 접혀, 꺼진 빌드에서 msw 청크가 빠진다.
const SHOULD_MOCK =
  (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL) ||
  process.env.NEXT_PUBLIC_USE_MOCKS === '1';

// 화면은 바로 그리고, API 요청만 워커가 뜰 때까지 기다리게 한다.
// (화면 렌더링을 막으면 서버가 아무것도 그리지 못해 Next 의 instant 검증이 에러를 낸다)
// - typeof window: 서버 번들에서는 이 분기가 지워져 msw/browser 를 해석하지 않는다(node: null).
// - SHOULD_MOCK: 목업이 꺼진 빌드에서는 false 로 고정돼 msw 청크가 생기지 않는다.
if (SHOULD_MOCK && typeof window !== 'undefined') {
  // 핫 리로드로 이 모듈이 다시 실행돼도 워커는 탭당 한 번만 시작한다.
  // 두 번 시작하면 MSW 가 WebSocket 전역을 다시 바꾸려다 "already replaced" 에러를 낸다.
  const tab = window as Window & { __bjkMockReady?: Promise<unknown> };
  // 핸들러는 ENDPOINTS 경로(/v1/..., /api/...) 그대로 같은 출처에서 잡는다. 주소가 있는 빌드(배포: /api)에서는
  // 요청이 /api/v1/parts 처럼 앞에 주소가 붙어 나가 핸들러에 걸리지 않고, 모두 실제 백엔드(BJK-AI-BE)로 간다.
  // (예전에는 형식이 정해지지 않은 3D 창고·엑셀 이관만 목업이 가로챘는데, 둘 다 백엔드로 옮겼다)
  tab.__bjkMockReady ??= import('@/mocks/browser').then(({ worker }) =>
    worker.start({ onUnhandledFrame: 'bypass', quiet: true }),
  );
  setRequestGate(tab.__bjkMockReady);
}

type MockProviderProps = {
  children: ReactNode;
};

const MockProvider = ({ children }: MockProviderProps) => children;

export default MockProvider;
