'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import Segmented from '@/components/ui/Segmented';

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

  return (
    <div className="flex flex-col gap-6">
      <Segmented
        label="리포트 종류"
        options={TABS}
        value={tab}
        onChange={(next) =>
          router.replace(next === 'orders' ? pathname : `${pathname}?tab=${next}`, {
            scroll: false,
          })
        }
      />
      {tab === 'orders' ? <PurchaseOrderList /> : <SimReportList />}
    </div>
  );
};

export default ReportsView;
