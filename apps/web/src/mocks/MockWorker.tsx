'use client';

import { useEffect } from 'react';

import { worker } from './browser';

type MockWorkerProps = {
  onReady: () => void;
};

// msw/browser 는 서버 번들에서 해석되지 않는다(package exports 의 node: null).
// 그래서 이 컴포넌트는 mock-provider 에서 next/dynamic({ ssr: false }) 로만 불러온다.
const MockWorker = ({ onReady }: MockWorkerProps) => {
  useEffect(() => {
    worker.start({ onUnhandledFrame: 'bypass', quiet: true }).then(onReady);
  }, [onReady]);

  return null;
};

export default MockWorker;
