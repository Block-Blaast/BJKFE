import type { Metadata } from 'next';

import WarehouseView from '@/components/desk/warehouse/WarehouseView';

export const metadata: Metadata = { title: '3D 창고' };

// 디지털 트윈 (W-11, v2) — 장부와 새벽 계산 결과를 선반·설비·입고 도크 위에 겹쳐 보여준다
const WarehousePage = () => {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-heading">3D 창고</h1>
        <p className="text-body-md text-text-secondary">
          선반·설비·입고 도크 위에 장부와 새벽 계산 결과를 입혔어요. 날짜를 옮기면 발주했을 때와 안
          했을 때의 앞날을 볼 수 있어요.
        </p>
      </header>
      <WarehouseView />
    </div>
  );
};

export default WarehousePage;
