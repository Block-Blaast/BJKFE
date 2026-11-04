import type { Metadata } from 'next';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '로그인' };

const ELEMENTS = [
  '작업자: 기기에 저장된 회사 코드로 직원 이름 목록 → 이름 선택 → PIN 4자리 키패드',
  '사장님: 이메일·비밀번호',
  'PIN 5회 연속 실패 시 10분 잠금 안내 (F-AUTH-02)',
  '리프레시 토큰으로 자동 로그인 (14일)',
];

const LoginPage = () => {
  return (
    <PagePlaceholder
      specId="M-01"
      title="로그인"
      description="작업자는 이름 선택 + PIN, 사장님은 이메일로 로그인해요."
      elements={ELEMENTS}
    />
  );
};

export default LoginPage;
