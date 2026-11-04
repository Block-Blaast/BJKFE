import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type {
  AcceptInviteInput,
  AuthResult,
  CompanyMember,
  EmailLoginInput,
  Invite,
  PinLoginInput,
  SignupInput,
} from './types/auth';

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const signup = (input: SignupInput) => post<AuthResult>(ENDPOINTS.signup, input);

export const loginWithEmail = (input: EmailLoginInput) =>
  post<AuthResult>(ENDPOINTS.emailLogin, input);

export const loginWithPin = (input: PinLoginInput) => post<AuthResult>(ENDPOINTS.pinLogin, input);

export const getCompanyMembers = (companyCode: string) =>
  request<CompanyMember[]>(ENDPOINTS.companyMembers(companyCode));

export const getInvite = (token: string) => request<Invite>(ENDPOINTS.invite(token));

export const acceptInvite = (token: string, input: AcceptInviteInput) =>
  post<AuthResult>(ENDPOINTS.acceptInvite(token), input);

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
