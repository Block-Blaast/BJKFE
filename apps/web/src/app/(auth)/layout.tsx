import type { ReactNode } from 'react';

// 로그인·가입·초대는 폰과 PC 가 같은 화면을 쓴다.
const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      {children}
    </main>
  );
};

export default AuthLayout;
