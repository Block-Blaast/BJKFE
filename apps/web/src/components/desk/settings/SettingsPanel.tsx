'use client';

import Button from '@bjk/ui/components/Button';

import { useCompanySettings } from '@/hooks/company/useCompany';

import SettingsForm from './SettingsForm';

const SettingsPanel = () => {
  const settings = useCompanySettings();

  if (settings.isPending) {
    return <p className="text-body-sm text-text-secondary">설정을 불러오는 중이에요…</p>;
  }
  if (settings.isError) {
    return (
      <Button variant="secondary" onClick={() => settings.refetch()}>
        설정 다시 불러오기
      </Button>
    );
  }
  // 저장되면 updated_at 이 바뀌어 폼이 저장된 값에서 다시 시작한다
  return <SettingsForm key={settings.data.updated_at ?? 'defaults'} initial={settings.data} />;
};

export default SettingsPanel;
