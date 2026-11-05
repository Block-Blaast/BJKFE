import type { Metadata } from 'next';

export const metadata: Metadata = { title: '3D 창고' };

// 3D 창고 시뮬레이션 (v2) — public/warehouse-3d.html 을 그대로 띄운다
// 제목이 iframe 안에만 있으면 바깥 문서의 제목 구조에 잡히지 않아 화면에는 숨긴 h1 을 둔다.
const WarehousePage = () => {
  return (
    <>
      <h1 className="sr-only">3D 창고</h1>
      <iframe
        src="/warehouse-3d.html"
        title="3D 창고 시뮬레이션"
        className="w-full flex-1 rounded-xl border-0"
      />
    </>
  );
};

export default WarehousePage;
