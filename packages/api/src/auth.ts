import { queryOptions } from '@tanstack/react-query';

import { request, setAuthTokens } from './client';
import type { Role } from './domain/auth';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type {
  AcceptInviteInput,
  AuthResult,
  AuthUser,
  CompanyMember,
  EmailLoginInput,
  Invite,
  PinLoginInput,
  SignupInput,
} from './types/auth';

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

// 백엔드(docs/api-spec/auth.md)의 로그인 응답은 user 에 회사가 없다(가입 응답은 company 가 바깥에 있다).
// 화면은 기기에 회사 코드를 저장해야 해서, 없으면 아는 값(PIN 로그인의 회사 코드)이나 GET /v1/me 로 채운다.
// 목업은 지금 형식(user.company)을 그대로 준다 — 둘 다 받는다.
type RawAuthResult = {
  access_token: string;
  refresh_token: string;
  user: Omit<AuthUser, 'company'> & { company?: AuthUser['company'] };
  company?: AuthUser['company'];
};

const finishAuth = async (raw: RawAuthResult, companyCode?: string): Promise<AuthResult> => {
  setAuthTokens(raw);
  let company = raw.user.company ?? raw.company;
  if (!company) {
    company = await request<{ company: AuthUser['company'] }>(ENDPOINTS.me)
      .then((me) => me.company)
      .catch(() => ({ id: '', name: '', code: companyCode ?? '' }));
  }
  return { ...raw, user: { ...raw.user, company } };
};

export const signup = async (input: SignupInput) =>
  finishAuth(await post<RawAuthResult>(ENDPOINTS.signup, input));

export const loginWithEmail = async (input: EmailLoginInput) =>
  finishAuth(await post<RawAuthResult>(ENDPOINTS.emailLogin, input));

export const loginWithPin = async (input: PinLoginInput) =>
  finishAuth(await post<RawAuthResult>(ENDPOINTS.pinLogin, input), input.company_code);

// 백엔드는 { items: [{ user_id, name }] }, 목업은 [{ id, name, role }] 를 준다. 화면은 뒤쪽 모양을 쓴다.
// 이 목록은 PIN 로그인용이라 백엔드는 역할을 주지 않는다 — 현장 직원(worker)으로 둔다.
type RawMember = { id?: string; user_id?: string; name: string; role?: Role };

export const getCompanyMembers = async (companyCode: string): Promise<CompanyMember[]> => {
  const raw = await request<RawMember[] | { items: RawMember[] }>(
    ENDPOINTS.companyMembers(companyCode),
  );
  const list = Array.isArray(raw) ? raw : raw.items;
  return list.map((m) => ({ id: m.id ?? m.user_id ?? '', name: m.name, role: m.role ?? 'worker' }));
};

export const getInvite = (token: string) => request<Invite>(ENDPOINTS.invite(token));

export const acceptInvite = async (token: string, input: AcceptInviteInput) =>
  finishAuth(await post<RawAuthResult>(ENDPOINTS.acceptInvite(token), input));

export const authQueries = {
  members: (companyCode: string) =>
    queryOptions({
      queryKey: queryKeys.auth.members(companyCode),
      queryFn: () => getCompanyMembers(companyCode),
    }),
  invite: (token: string) =>
    queryOptions({
      queryKey: queryKeys.auth.invite(token),
      queryFn: () => getInvite(token),
      // 만료·사용된 초대는 다시 시도해도 같다
      retry: false,
    }),
};
