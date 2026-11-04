import type { Metadata } from 'next';

import SignupForm from '@/components/auth/SignupForm';

export const metadata: Metadata = { title: '회사 등록' };

// 가입 후 첫 화면은 기준 정보(W-08) 안내가 맞다 — 역할별 첫 화면을 넣을 때 함께 정한다 TODO(auth)
const SignupPage = () => {
  return <SignupForm />;
};

export default SignupPage;
