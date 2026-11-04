import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { acceptInvite, loginWithEmail, loginWithPin, signup } from '@bjk/api/auth';
import type { AcceptInviteInput, AuthResult } from '@bjk/api/types/auth';

import { saveDeviceCompanyCode } from './useDeviceCompanyCode';

// 로그인·가입·초대 수락이 성공한 뒤의 공통 처리
const useCompleteAuth = () => {
  const router = useRouter();
  return (result: AuthResult) => {
    saveDeviceCompanyCode(result.user.company.code);
    // TODO(auth): 토큰 보관(httpOnly 쿠키 vs 기기 저장)을 백엔드와 정한 뒤 여기서 저장한다.
    // 첫 화면은 proxy.ts 가 기기별로 정한다. 역할별 첫 화면도 proxy 에 함께 넣는다.
    router.replace('/');
  };
};

export const useSignup = () => {
  const complete = useCompleteAuth();
  return useMutation({ mutationFn: signup, onSuccess: complete });
};

export const useEmailLogin = () => {
  const complete = useCompleteAuth();
  return useMutation({ mutationFn: loginWithEmail, onSuccess: complete });
};

export const usePinLogin = () => {
  const complete = useCompleteAuth();
  return useMutation({ mutationFn: loginWithPin, onSuccess: complete });
};

export const useAcceptInvite = (token: string) => {
  const complete = useCompleteAuth();
  return useMutation({
    mutationFn: (input: AcceptInviteInput) => acceptInvite(token, input),
    onSuccess: complete,
  });
};
