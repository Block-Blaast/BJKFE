'use client';

import type { ReactNode } from 'react';

import { setAuthTokens, setRequestGate, USES_BACKEND } from '@bjk/api/client';
import { ENDPOINTS } from '@bjk/api/endpoints';

// 시연 자동 로그인.
// 이 서비스는 아직 로그인 화면이 없지만 백엔드(parts·reviews·me·chat 등)는 JWT 인증을 요구한다.
// 그래서 앱이 뜰 때 시연용 owner 계정으로 한 번 로그인해 토큰을 기기에 저장한다.
// - 백엔드가 있는 빌드(USES_BACKEND)에서만 동작한다. 목업 전용(로컬) 빌드에서는 건너뛴다.
// - 이미 토큰이 있으면(새로고침 등) 다시 로그인하지 않는다.
// - 로그인은 client 의 request 를 쓰지 않고 fetch 로 직접 보낸다.
//   request 는 setRequestGate 로 건 대기(자기 자신)를 기다려 교착이 날 수 있기 때문이다.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'bjk.auth';
const DEMO_EMAIL = 'owner@hanseo.kr';
const DEMO_PASSWORD = 'demo-owner-1234';

const hasToken = () => {
  try {
    return Boolean(window.localStorage.getItem(TOKEN_KEY));
  } catch {
    return false;
  }
};

if (USES_BACKEND && typeof window !== 'undefined') {
  const tab = window as Window & { __bjkAuthReady?: Promise<unknown> };
  // 다른 요청이 로그인보다 먼저 나가 401 을 받지 않도록, 로그인이 끝날 때까지 요청을 대기시킨다.
  tab.__bjkAuthReady ??= (async () => {
    if (hasToken()) return;
    try {
      const res = await fetch(`${BASE_URL}${ENDPOINTS.emailLogin}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
      });
      if (res.ok) {
        const data = (await res.json()) as { access_token: string; refresh_token: string };
        setAuthTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
      }
    } catch {
      // 로그인 실패해도 화면은 뜬다 — 인증이 필요한 요청만 401 로 비게 된다
    }
  })();
  setRequestGate(tab.__bjkAuthReady);
}

type DemoAuthProviderProps = {
  children: ReactNode;
};

const DemoAuthProvider = ({ children }: DemoAuthProviderProps) => children;

export default DemoAuthProvider;
