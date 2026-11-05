'use client';

import { SkeletonLines } from '@/components/ui/feedback/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import { useCompanySettings } from '@/hooks/company/useCompany';

import SettingsForm from './SettingsForm';

const SettingsPanel = () => {
  const settings = useCompanySettings();

  if (settings.isPending) {
    return <SkeletonLines label="설정을 불러오는 중" />;
  }
  if (settings.isError) {
    return (
      <ErrorState
        title="설정을 불러오지 못했어요"
        onRetry={() => settings.refetch()}
        size="inline"
      />
    );
  }
  // 저장되면 updated_at 이 바뀌어 폼이 저장된 값에서 다시 시작한다
  return <SettingsForm key={settings.data.updated_at ?? 'defaults'} initial={settings.data} />;
};

export default SettingsPanel;
