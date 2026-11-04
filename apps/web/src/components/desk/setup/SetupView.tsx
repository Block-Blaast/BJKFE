'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import Segmented from '@/components/ui/Segmented';

import CategoryDefaults from './CategoryDefaults';
import EquipmentSection from './EquipmentSection';
import MaintenanceSection from './MaintenanceSection';
import PartImport from './PartImport';
import SupplierSection from './SupplierSection';

const TABS = [
  ['import', '부품 이관'],
  ['equipment', '설비'],
  ['maintenance', '정비 일정'],
  ['suppliers', '공급사'],
  ['categories', '카테고리 기본값'],
] as const;

type Tab = (typeof TABS)[number][0];

const isTab = (value: string | null): value is Tab => TABS.some(([t]) => t === value);

// 기준 정보 (W-08). 탭은 URL(?tab=)에 둬서 새로고침·링크 공유에도 유지한다 (desk.md).
// usePathname·useSearchParams 를 쓰므로 페이지에서 <Suspense> 로 감싼다.
const SetupView = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const tab: Tab = isTab(raw) ? raw : 'import';

  return (
    <div className="flex flex-col gap-6">
      <Segmented
        label="기준 정보 종류"
        options={TABS}
        value={tab}
        onChange={(next) =>
          router.replace(next === 'import' ? pathname : `${pathname}?tab=${next}`, {
            scroll: false,
          })
        }
      />
      {tab === 'import' ? <PartImport /> : null}
      {tab === 'equipment' ? <EquipmentSection /> : null}
      {tab === 'maintenance' ? <MaintenanceSection /> : null}
      {tab === 'suppliers' ? <SupplierSection /> : null}
      {tab === 'categories' ? <CategoryDefaults /> : null}
    </div>
  );
};

export default SetupView;
