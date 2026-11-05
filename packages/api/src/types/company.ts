// 회사 설정·직원·초대 (W-10) — 백엔드 SYS-01(docs/api-spec/system.md), AUTH-06·09(auth.md) 형식.
import type { Role } from '../domain/auth';

// 검토 기준값 — 사장님이 바꾸는 값 (SYS-01 review). 허용 범위는 서버가 검사한다
export type ReviewSettings = {
  service_level: { A: number; B: number; C: number }; // F-ANAL-06 재주문점 서비스 수준, 0.80~0.995
  next_order_weeks: number; // F-REVIEW-02 대비 기간 T = LT90 + 다음 발주까지 N주 (1~8)
  c02_months: number; // C-02 장기 재고화 기준 개월 (3~24)
  c05_sigma: number; // C-05 단가 이상: 평균 + Nσ 초과 (1~3)
  c06_ratio: number; // C-06 더 싼 공급사: 요청 단가 × N 이하 (0.5~0.95)
  c08_days: number; // C-08 마감 임박: 마감까지 N일 이하 (1~14)
};

// 알림 (F-NOTI-03): 조용한 시간에는 긴급도 모아서 아침에 보낸다
export type NotifySettings = {
  quiet_hours: { start: string; end: string }; // 'HH:MM'
  briefing_time: string; // 'HH:MM', 06:00~10:00
};

// 시뮬레이션 결과로만 조정하는 시스템 값 — 사장님은 읽기만 한다 (PATCH 하면 400)
export type SystemSettings = {
  c05_min_ratio: number;
  c05_small_n_ratio: number;
  missed_p_out_min: number;
  [key: string]: number;
};

export type CompanySettings = {
  notify: NotifySettings;
  review: ReviewSettings;
  system: SystemSettings;
  updated_at: string | null; // 기본값 그대로면 null
};

export type UpdateCompanySettingsInput = Pick<CompanySettings, 'notify' | 'review'>;

// 사장님은 가입으로만 생긴다. 초대·역할 변경은 작업자 ↔ 관리자만 (F-AUTH-01·03)
export type StaffRole = Exclude<Role, 'owner'>;

export type CreateInviteInput = {
  role: StaffRole;
};

export type CreatedInvite = {
  token: string;
  role: StaffRole;
  expires_at: string; // 72시간 (F-AUTH-02)
};

export type UpdateMemberInput = {
  role: StaffRole;
};
