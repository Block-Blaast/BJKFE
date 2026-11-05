import type { ReactNode } from 'react';

// 웹 화면(PC). 데스크톱 전용이라 최소 폭(1280px)을 둔다.
// 상단 메뉴는 없다(v3) — 3D 창고(/warehouse)가 입구이고, 기존 화면은 (pages) 그룹에서 3D 창고로 돌아가는 줄을 단다.
const DeskLayout = ({ children }: { children: ReactNode }) => {
  return <div className="flex min-h-dvh min-w-7xl flex-col bg-bg-canvas p-5">{children}</div>;
};

export default DeskLayout;
