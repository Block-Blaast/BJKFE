import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import InviteSection from '@/components/desk/settings/InviteSection';
import SettingsPanel from '@/components/desk/settings/SettingsPanel';
import StaffSection from '@/components/desk/settings/StaffSection';

export const metadata: Metadata = { title: '직원·설정' };

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-4 rounded-xl bg-bg-surface p-6 shadow-card">
    <h2 className="text-h3 text-text-heading">{title}</h2>
    {children}
  </section>
);

// 직원·설정 (W-10). TODO(auth): 사장님만 들어올 수 있게 막는다 (F-AUTH-03).
const SettingsPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-heading">직원·설정</h1>
        <p className="text-body-md text-text-secondary">사장님만 바꿀 수 있어요.</p>
      </header>
      <div className="grid grid-cols-2 gap-6">
        <Section title="직원">
          <StaffSection />
        </Section>
        <Section title="직원 초대">
          <InviteSection />
        </Section>
      </div>
      <Section title="검토 기준값과 알림">
        <SettingsPanel />
      </Section>
    </div>
  );
};

export default SettingsPage;
