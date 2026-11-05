import type { Metadata } from 'next';
import { ViewTransition } from 'react';

import WarehouseView from '@/components/desk/warehouse/WarehouseView';

export const metadata: Metadata = { title: '3D 창고' };

// 3D 창고 디지털 트윈 (W-11) — public/warehouse-3d.html(iframe) 위에 React 오버레이를 겹친다.
// 제목이 iframe 안에만 있으면 바깥 문서의 제목 구조에 잡히지 않아 화면에는 숨긴 h1 을 둔다.
// 화면 상태는 store 에 있고 요청 시점 값(searchParams 등)을 읽지 않아 Suspense 가 필요 없다.
// 상세 페이지로 갈 때는 3D 속으로 들어가듯 커지며 흐려지고, 돌아오면 반대로 가라앉는다 ((pages)/layout 과 짝)
const WarehousePage = () => {
  return (
    <ViewTransition enter="desk-warehouse-in" exit="desk-warehouse-out" default="none">
      <main className="flex flex-1 flex-col">
        <h1 className="sr-only">3D 창고</h1>
        <WarehouseView />
      </main>
    </ViewTransition>
  );
};

export default WarehousePage;
