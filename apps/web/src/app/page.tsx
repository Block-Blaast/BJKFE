import { redirect } from 'next/navigation';

// 보통은 proxy.ts 가 기기별 첫 화면으로 먼저 보낸다. proxy 를 거치지 않은 경우의 안전망이다.
const RootPage = () => {
  redirect('/dashboard');
};

export default RootPage;
