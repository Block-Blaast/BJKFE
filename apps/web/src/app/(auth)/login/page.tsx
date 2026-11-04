import type { Metadata } from 'next';

import LoginView from '@/components/auth/LoginView';

export const metadata: Metadata = { title: '로그인' };

const LoginPage = () => {
  return <LoginView />;
};

export default LoginPage;
