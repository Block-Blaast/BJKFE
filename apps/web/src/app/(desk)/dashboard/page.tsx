import type { Metadata } from 'next';

import Dashboard from '@/components/desk/Dashboard';

export const metadata: Metadata = { title: '대시보드' };

const DashboardPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-heading">대시보드</h1>
        <p className="text-body-md text-text-secondary">
          결품 위험, 결정할 검토, 장부 의심 항목을 한눈에 봐요.
        </p>
      </header>
      <Dashboard />
    </div>
  );
};

export default DashboardPage;
