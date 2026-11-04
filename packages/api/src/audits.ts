import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { CompanyMember } from './types/auth';
import type {
  AuditItem,
  AuditListFilters,
  MergeCandidate,
  MergeInput,
  RequestAuditInput,
} from './types/audit';

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const getAudits = ({ status }: AuditListFilters) =>
  request<AuditItem[]>(`${ENDPOINTS.audits}${status ? `?status=${status}` : ''}`);

export const requestAudit = (id: string, input: RequestAuditInput) =>
  post<AuditItem>(ENDPOINTS.auditRequest(id), input);

export const getMergeCandidates = () => request<MergeCandidate[]>(ENDPOINTS.mergeCandidates);

export const mergeParts = (id: string, input: MergeInput) =>
  post<MergeCandidate>(ENDPOINTS.merge(id), input);

export const dismissMerge = (id: string) => post<MergeCandidate>(ENDPOINTS.dismissMerge(id));

// 로그인한 회사의 직원 목록 — 인증 연동 전에는 서버가 회사를 세션에서 안다고 가정한다
export const getMembers = () => request<CompanyMember[]>(ENDPOINTS.members);

export const auditQueries = {
  list: (filters: AuditListFilters) =>
    queryOptions({
      queryKey: queryKeys.audits.list(filters),
      queryFn: () => getAudits(filters),
    }),
  mergeCandidates: () =>
    queryOptions({
      queryKey: queryKeys.mergeCandidates.all,
      queryFn: getMergeCandidates,
    }),
  members: () =>
    queryOptions({
      queryKey: queryKeys.auth.companyMembers(),
      queryFn: getMembers,
    }),
};
