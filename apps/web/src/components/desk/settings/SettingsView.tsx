'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import FolderCard from '@/components/ui/FolderCard';
import { useCompanyStaff } from '@/hooks/audit/useAudits';
import { useCompanySettings } from '@/hooks/company/useCompany';
import { formatComputedAt } from '@/utils/format';

import InviteSection from './InviteSection';
import SettingsPanel from './SettingsPanel';
import StaffSection from './StaffSection';

const TABS = [
  ['staff', '직원'],
  ['invite', '직원 초대'],
  ['review', '검토 기준값'],
] as const;

type Tab = (typeof TABS)[number][0];

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-4 rounded-xl bg-bg-surface p-6 shadow-card">
    <h2 className="text-h3 text-text-heading">{title}</h2>
    {children}
  </section>
);

// 직원·설정 (W-10). 폴더(탭)는 URL(?tab=)에 둔다. usePathname·useSearchParams 를 쓰므로 페이지에서 <Suspense> 로 감싼다.
const SettingsView = () => {
  const router = useRouter();
  const pathname = usePathname();
  const raw = useSearchParams().get('tab');
  const tab: Tab = TABS.find(([t]) => t === raw)?.[0] ?? 'staff';
  const staff = useCompanyStaff();
  const settings = useCompanySettings();

  const folders: Record<Tab, { count: string; foot: string }> = {
    staff: {
      count: staff.data ? `${staff.data.length}명` : '…',
      foot: '역할: 작업자 · 관리자',
    },
    invite: { count: 'QR 한 번', foot: '72시간 동안 쓸 수 있어요' },
    review: {
      count: '체크·알림 기준',
      foot: settings.data?.updated_at
        ? `${formatComputedAt(settings.data.updated_at)} 수정`
        : '명세서 기본값',
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="설정 종류" className="grid grid-cols-5 gap-5">
        {TABS.map(([key, title]) => (
          <FolderCard
            key={key}
            title={title}
            count={folders[key].count}
            foot={folders[key].foot}
            selected={tab === key}
            onClick={() =>
              router.replace(key === 'staff' ? pathname : `${pathname}?tab=${key}`, {
                scroll: false,
              })
            }
          />
        ))}
      </nav>
      {tab === 'staff' ? (
        <Section title="직원">
          <StaffSection />
        </Section>
      ) : null}
      {tab === 'invite' ? (
        <Section title="직원 초대">
          <InviteSection />
        </Section>
      ) : null}
      {tab === 'review' ? (
        <Section title="검토 기준값과 알림">
          <SettingsPanel />
        </Section>
      ) : null}
    </div>
  );
};

export default SettingsView;
