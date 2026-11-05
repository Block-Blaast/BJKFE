import { redirect } from 'next/navigation';

// 보통은 proxy.ts 가 기기별 첫 화면으로 먼저 보낸다. proxy 를 거치지 않은 경우의 안전망이라 기기를 모르므로 PC 첫 화면(3D 창고)으로 보낸다.
const RootPage = () => {
  redirect('/warehouse');
};

export default RootPage;
