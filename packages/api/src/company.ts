import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { CompanyMember } from './types/auth';
import type {
  CompanySettings,
  CreatedInvite,
  CreateInviteInput,
  UpdateCompanySettingsInput,
  UpdateMemberInput,
} from './types/company';

const send = <T>(method: 'POST' | 'PUT' | 'PATCH', path: string, body: unknown) =>
  request<T>(path, { method, body: JSON.stringify(body) });

export const getCompanySettings = () => request<CompanySettings>(ENDPOINTS.companySettings);

export const updateCompanySettings = (input: UpdateCompanySettingsInput) =>
  send<CompanySettings>('PUT', ENDPOINTS.companySettings, input);

export const createInvite = (input: CreateInviteInput) =>
  send<CreatedInvite>('POST', ENDPOINTS.invites, input);

export const updateMember = (id: string, input: UpdateMemberInput) =>
  send<CompanyMember>('PATCH', ENDPOINTS.member(id), input);

export const companyQueries = {
  settings: () =>
    queryOptions({ queryKey: queryKeys.company.settings(), queryFn: getCompanySettings }),
};
