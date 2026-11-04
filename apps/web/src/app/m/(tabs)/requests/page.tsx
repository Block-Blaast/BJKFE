import type { Metadata } from 'next';

import MyRequestList from '@/components/mobile/MyRequestList';

export const metadata: Metadata = { title: '내 요청' };

// TODO(F-APPROVAL-02): 보류된 요청의 보완 입력 — 서버 보완 API 가 나오면 추가
const MyRequestsPage = () => {
  return <MyRequestList />;
};

export default MyRequestsPage;
