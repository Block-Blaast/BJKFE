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

// 직원 항목 (AUTH-09). 화면은 이름·역할만 쓴다
type BackendStaff = CompanyMember & { email: string | null; has_pin: boolean; active: boolean };

const send = <T>(method: 'POST' | 'PATCH', path: string, body: unknown) =>
  request<T>(path, { method, body: JSON.stringify(body) });

// 사장님 전용(SYS-01). 설정 행이 없는 회사는 서버 기본값과 updated_at: null 을 준다
export const getCompanySettings = () => request<CompanySettings>(ENDPOINTS.companySettings);

// 보낸 키만 바뀐다. 정의되지 않은 키(system 포함)는 400 이라, GET 응답에 다른 키가 섞여 와도 아는 키만 골라 보낸다
export const updateCompanySettings = ({ notify, review }: UpdateCompanySettingsInput) =>
  send<CompanySettings>('PATCH', ENDPOINTS.companySettings, {
    notify: {
      quiet_hours: { start: notify.quiet_hours.start, end: notify.quiet_hours.end },
      briefing_time: notify.briefing_time,
    },
    review: {
      service_level: review.service_level,
      next_order_weeks: review.next_order_weeks,
      c02_months: review.c02_months,
      c05_sigma: review.c05_sigma,
      c06_ratio: review.c06_ratio,
      c08_days: review.c08_days,
    },
  });

// 응답의 join_url(백엔드 /join/{token})은 쓰지 않는다 — 화면이 자기 주소로 초대 링크를 만든다
export const createInvite = async (input: CreateInviteInput): Promise<CreatedInvite> => {
  const raw = await send<CreatedInvite>('POST', ENDPOINTS.invites, input);
  return { token: raw.token, role: raw.role, expires_at: raw.expires_at };
};

export const updateMember = async (id: string, input: UpdateMemberInput) => {
  const raw = await send<BackendStaff>('PATCH', ENDPOINTS.member(id), input);
  return { id: raw.id, name: raw.name, role: raw.role } satisfies CompanyMember;
};

export const companyQueries = {
  settings: () =>
    queryOptions({ queryKey: queryKeys.company.settings(), queryFn: getCompanySettings }),
};
