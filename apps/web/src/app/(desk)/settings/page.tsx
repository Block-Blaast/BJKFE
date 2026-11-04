import type { Metadata } from 'next';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '직원·설정' };

const ELEMENTS = [
  '직원 목록·역할 변경',
  '초대 QR 생성 (역할 지정, 72시간)',
  '검토 기준값 (F-REVIEW-04 기준값)',
  '알림 시간·조용한 시간 (기본 21:00~07:00)',
];

const SettingsPage = () => {
  return (
    <PagePlaceholder
      specId="W-10"
      title="직원·설정"
      description="직원과 회사 설정을 관리해요. 사장님 전용."
      elements={ELEMENTS}
    />
  );
};

export default SettingsPage;
