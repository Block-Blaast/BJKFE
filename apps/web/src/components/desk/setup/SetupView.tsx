'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import FolderCard from '@/components/ui/FolderCard';
import { useCategories, useEquipment, useMaintenance, useSuppliers } from '@/hooks/setup/useSetup';

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
  const equipment = useEquipment();
  const maintenance = useMaintenance();
  const suppliers = useSuppliers();
  const categories = useCategories();
  const count = (n: number | undefined, unit: string) => (n === undefined ? '…' : `${n}${unit}`);
  const upcoming = maintenance.data?.filter((m) => !m.completed_at).length;

  const folders: Record<Tab, { count: string; foot: string }> = {
    import: { count: '엑셀 → AI 제안', foot: '이름·재고·단위만 있으면 돼요' },
    equipment: { count: count(equipment.data?.length, '대'), foot: '멈추면 손실이 나는 설비' },
    maintenance: { count: `예정 ${count(upcoming, '건')}`, foot: '정비 부품은 미리 필요량으로' },
    suppliers: { count: count(suppliers.data?.length, '곳'), foot: '납기·단가·MOQ' },
    categories: { count: count(categories.data?.length, '개'), foot: '수입 의존·외부 요인' },
  };

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="기준 정보 종류" className="grid grid-cols-5 gap-5">
        {TABS.map(([key, title]) => (
          <FolderCard
            key={key}
            title={title}
            count={folders[key].count}
            foot={folders[key].foot}
            selected={tab === key}
            onClick={() =>
              router.replace(key === 'import' ? pathname : `${pathname}?tab=${key}`, {
                scroll: false,
              })
            }
          />
        ))}
      </nav>
      {tab === 'import' ? <PartImport /> : null}
      {tab === 'equipment' ? <EquipmentSection /> : null}
      {tab === 'maintenance' ? <MaintenanceSection /> : null}
      {tab === 'suppliers' ? <SupplierSection /> : null}
      {tab === 'categories' ? <CategoryDefaults /> : null}
    </div>
  );
};

export default SetupView;
