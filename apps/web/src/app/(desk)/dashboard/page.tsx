import type { Metadata } from 'next';

import Dashboard from '@/components/desk/Dashboard';

export const metadata: Metadata = { title: '대시보드' };

// 제목·부제는 Dashboard 가 지표 계산 시각과 함께 그린다
const DashboardPage = () => {
  return <Dashboard />;
};

export default DashboardPage;
