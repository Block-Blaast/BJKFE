// 회사 설정·직원·초대 (W-10) — 임시 계약. 값의 뜻과 기본값은 명세서를, HTTP 형식은 임시로 정했다.
// 백엔드 OpenAPI 가 나오면 생성된 타입으로 교체하고, 이 파일을 지운다.
import type { Role } from '../domain/auth';

// 검토 기준값 — "기준값은 회사별 설정값이며 F-SIM 으로 조정한다" (F-REVIEW-04)
export type ReviewSettings = {
  deadline_days: number; // C-08 마감 임박: 마감까지 N일 이하 (기본 5)
  price_sigma: number; // C-05 단가 이상(n ≥ 3): 평균 + Nσ 초과 (기본 2)
  price_min_ratio: number; // C-05 단가 이상(n ≥ 3): 평균 × N 초과도 함께 (기본 1.05)
  price_few_ratio: number; // C-05 단가 이상(n = 1~2): 평균 × N 초과 (기본 1.15)
  cheaper_ratio: number; // C-06 더 싼 공급사: 요청 단가 × N 이하 (기본 0.9)
  // 아래 null 인 항목은 백엔드 설정(SYS-01)에 없는 값이다 — 화면에서 뺀다
  supplier_keep_pct: number | null; // F-REVIEW-05 요청 공급사가 최저가와 N% 이내면 유지 (기본 3)
  tier_increase_pct: number | null; // F-REVIEW-05 단가 구간 대안: 총액 증가 N% 이내 (기본 5)
  next_order_weeks: number; // F-REVIEW-02 대비 기간 T = LT90 + 다음 발주까지 N주 (기본 4)
  service_level: { A: number; B: number; C: number }; // F-ANAL-06 재주문점 서비스 수준 % (98·95·90)
  missed_p_out_pct: number; // F-MISSED-01 놓친 발주: 결품 확률 N% 이상 (기본 30)
  // F-MISSED-01 놓친 발주: 마감이 오늘 + N일 이내 (기본 3). 백엔드는 C-08 마감 임박 일수를 같이 쓴다 — null
  missed_deadline_days: number | null;
};

// 알림 (F-NOTI-03): 조용한 시간에는 긴급도 모아서 아침에 보낸다
export type NotificationSettings = {
  quiet_start: string; // 'HH:mm' (기본 21:00)
  quiet_end: string; // 'HH:mm' (기본 07:00)
};

export type CompanySettings = {
  review: ReviewSettings;
  notifications: NotificationSettings;
  updated_at: string | null;
  // [추가] 사장님이 바꿀 수 없는 항목 — 백엔드 시스템 값(system)으로, 검증(F-SIM) 결과로만 조정한다
  locked?: (keyof ReviewSettings)[];
};

export type UpdateCompanySettingsInput = Pick<CompanySettings, 'review' | 'notifications'>;

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
