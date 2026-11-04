import type { ReactNode } from 'react';

// 앱 화면(폰). 모바일 폭 컨테이너 — PC 에서 열어도 가운데 폰 폭으로 보인다.
const MobileLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg-page">{children}</div>
  );
};

export default MobileLayout;
