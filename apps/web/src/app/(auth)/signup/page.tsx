import type { Metadata } from 'next';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '사장님 가입' };

const ELEMENTS = [
  '회사명, 이름, 이메일, 비밀번호(8자 이상)',
  '이메일 중복 409 처리',
  '가입 후 기준 정보(W-08)로 안내',
];

const SignupPage = () => {
  return (
    <PagePlaceholder
      specId="F-AUTH-01"
      title="사장님 가입"
      description="회사를 만들고 사장님 계정으로 시작해요."
      elements={ELEMENTS}
    />
  );
};

export default SignupPage;
