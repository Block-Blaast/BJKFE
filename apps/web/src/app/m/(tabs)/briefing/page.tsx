import type { Metadata } from 'next';

import BriefingView from '@/components/mobile/BriefingView';

export const metadata: Metadata = { title: '아침 브리핑' };

// TODO(auth): 사장님 전용 (M-04). TODO(F-NOTI): 07:30 웹 푸시로 이 화면을 연다.
const BriefingPage = () => {
  return <BriefingView />;
};

export default BriefingPage;
