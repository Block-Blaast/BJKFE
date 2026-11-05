// 장부 검증(F-AUDIT) 도메인 상수. 규칙과 등급은 명세서 11장 표 그대로다.

export const AUDIT_GRADES = ['높음', '중간', '낮음'] as const;
export type AuditGrade = (typeof AUDIT_GRADES)[number];

// 화면·브리핑은 높음 → 중간 → 낮음 순 (F-AUDIT-06)
export const AUDIT_GRADE_ORDER: Record<AuditGrade, number> = { 높음: 0, 중간: 1, 낮음: 2 };

export const AUDIT_RULES = {
  'F-AUDIT-01': { name: '재고가 0보다 적음', grade: '높음' },
  'F-AUDIT-02': { name: '정비·출고 기록 차이', grade: '높음' },
  'F-AUDIT-03': { name: '평소와 다른 사용량', grade: '중간' },
  'F-AUDIT-04': { name: '갑자기 늘어난 사용량', grade: '중간' },
  'F-AUDIT-05': { name: '오래 세지 않음', grade: '낮음' },
} as const satisfies Record<string, { name: string; grade: AuditGrade }>;
export type AuditRule = keyof typeof AUDIT_RULES;

// 실사 응답의 차이 사유 (F-CHAT-05)
export const ADJUST_REASONS = ['분실', '기록 누락', '파손', '기타'] as const;
export type AdjustReason = (typeof ADJUST_REASONS)[number];

// 의심 항목 상태: 열림 → 실사 요청됨 → 종료(차이 기록 또는 이상 없음)
export const AUDIT_STATUSES = ['open', 'requested', 'resolved'] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];
