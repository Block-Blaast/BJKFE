import type { Metadata } from 'next';

export const metadata: Metadata = { title: '3D 창고' };

// 3D 창고 시뮬레이션 (v2) — public/warehouse-3d.html 을 그대로 띄운다
const WarehousePage = () => {
  return (
    <iframe
      src="/warehouse-3d.html"
      title="3D 창고 시뮬레이션"
      className="w-full flex-1 rounded-xl border-0"
    />
  );
};

export default WarehousePage;
