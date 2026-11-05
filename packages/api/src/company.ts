import { queryOptions } from '@tanstack/react-query';

import { request, USES_BACKEND } from './client';
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

// ---- 백엔드 설정 형식 (SYS-01) ----
// 사장님이 바꾸는 값(notify·review)과 시뮬레이션으로만 조정하는 시스템 값(system)으로 나뉜다.
// 확률은 0~1 로 오고, 화면은 % 로 보여 준다. 목업은 CompanySettings 를 그대로 준다.
type BackendSettings = {
  notify: { quiet_hours: { start: string; end: string }; briefing_time: string };
  review: {
    service_level: { A: number; B: number; C: number };
    next_order_weeks: number;
    c05_sigma: number;
    c06_ratio: number;
    c08_days: number;
  };
  system: { c05_min_ratio: number; c05_small_n_ratio: number; missed_p_out_min: number };
  updated_at: string | null;
};

// 소수 오차(0.98 × 100 = 98.00000000000001)를 화면에 보이지 않게 한다
const pct = (ratio: number) => Math.round(ratio * 1000) / 10;

const fromBackend = (s: BackendSettings): CompanySettings => ({
  review: {
    deadline_days: s.review.c08_days,
    price_sigma: s.review.c05_sigma,
    price_min_ratio: s.system.c05_min_ratio,
    price_few_ratio: s.system.c05_small_n_ratio,
    cheaper_ratio: s.review.c06_ratio,
    supplier_keep_pct: null,
    tier_increase_pct: null,
    next_order_weeks: s.review.next_order_weeks,
    service_level: {
      A: pct(s.review.service_level.A),
      B: pct(s.review.service_level.B),
      C: pct(s.review.service_level.C),
    },
    missed_p_out_pct: pct(s.system.missed_p_out_min),
    missed_deadline_days: null,
  },
  notifications: { quiet_start: s.notify.quiet_hours.start, quiet_end: s.notify.quiet_hours.end },
  updated_at: s.updated_at,
  locked: ['price_min_ratio', 'price_few_ratio', 'missed_p_out_pct'],
});

// PATCH 는 보낸 키만 바꾸고, system 키를 보내면 400 이다
const toBackendPatch = ({ review, notifications }: UpdateCompanySettingsInput) => ({
  notify: { quiet_hours: { start: notifications.quiet_start, end: notifications.quiet_end } },
  review: {
    c08_days: review.deadline_days,
    c05_sigma: review.price_sigma,
    c06_ratio: review.cheaper_ratio,
    next_order_weeks: review.next_order_weeks,
    service_level: {
      A: review.service_level.A / 100,
      B: review.service_level.B / 100,
      C: review.service_level.C / 100,
    },
  },
});

const isBackendSettings = (raw: CompanySettings | BackendSettings): raw is BackendSettings =>
  'notify' in raw;

const settingsOf = (raw: CompanySettings | BackendSettings) =>
  isBackendSettings(raw) ? fromBackend(raw) : raw;

export const getCompanySettings = async () =>
  settingsOf(await request<CompanySettings | BackendSettings>(ENDPOINTS.companySettings));

export const updateCompanySettings = async (input: UpdateCompanySettingsInput) =>
  settingsOf(
    USES_BACKEND
      ? await send<BackendSettings>('PATCH', ENDPOINTS.companySettings, toBackendPatch(input))
      : await send<CompanySettings>('PUT', ENDPOINTS.companySettings, input),
  );

// 백엔드 응답에는 접속 주소(join_url)도 있지만, 화면은 이 웹의 /invite/[token] 으로 QR 을 만든다
export const createInvite = (input: CreateInviteInput) =>
  send<CreatedInvite>('POST', ENDPOINTS.invites, input);

export const updateMember = (id: string, input: UpdateMemberInput) =>
  send<CompanyMember>('PATCH', ENDPOINTS.member(id), input);

export const companyQueries = {
  settings: () =>
    queryOptions({ queryKey: queryKeys.company.settings(), queryFn: getCompanySettings }),
};
