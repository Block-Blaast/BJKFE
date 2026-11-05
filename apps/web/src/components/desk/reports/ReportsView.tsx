'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import FolderCard from '@/components/ui/FolderCard';
import { usePurchaseOrders, useSimReports } from '@/hooks/report/useReports';

import PurchaseOrderList from './PurchaseOrderList';
import SimReportList from './SimReportList';

const TABS = [
  ['orders', '발주 PDF'],
  ['sim', '검증 리포트'],
] as const;

type Tab = (typeof TABS)[number][0];

// 리포트 (W-09). 탭은 URL(?tab=)에 둔다. usePathname·useSearchParams 를 쓰므로 페이지에서 <Suspense> 로 감싼다.
const ReportsView = () => {
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = useSearchParams().get('tab') === 'sim' ? 'sim' : 'orders';
  const orders = usePurchaseOrders();
  const sims = useSimReports();
  const folders: Record<Tab, { count: string; foot: string }> = {
    orders: {
      count: orders.data ? `${orders.data.length}건` : '…',
      foot: '결재용 PDF · 발주 문구',
    },
    sim: { count: sims.data ? `${sims.data.length}건` : '…', foot: '검토 기준값 검증' },
  };

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="리포트 종류" className="grid grid-cols-5 gap-5">
        {TABS.map(([key, title]) => (
          <FolderCard
            key={key}
            title={title}
            count={folders[key].count}
            foot={folders[key].foot}
            selected={tab === key}
            onClick={() =>
              router.replace(key === 'orders' ? pathname : `${pathname}?tab=${key}`, {
                scroll: false,
              })
            }
          />
        ))}
      </nav>
      {tab === 'orders' ? <PurchaseOrderList /> : <SimReportList />}
    </div>
  );
};

export default ReportsView;
