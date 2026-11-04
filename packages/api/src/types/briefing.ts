// 아침 브리핑 (M-04, F-NOTI-02) — 임시 계약. 명세서에는 세 가지 건수와 정렬 기준만 있다.
// 백엔드 OpenAPI 가 나오면 생성된 타입으로 교체하고, 이 파일을 지운다.
import type { Review } from './review';

export type AuditItem = {
  id: string;
  part: { id: string; name: string; unit: string };
  grade: '높음' | '중간' | '낮음';
  reason: string;
  ledger_qty: number;
};

export type Briefing = {
  // 놓친 발주: 아침 스캔(07:00)이 만든 시스템 초안 — 예상 손실 순 (F-MISSED-01)
  missed: { items: Review[]; loss_total: number | null };
  // 검토 대기: 결정을 기다리는 검토
  pending_reviews: { items: Review[] };
  // 실사 필요: 장부 검증이 찾은 의심 품목 (F-AUDIT)
  audits: { items: AuditItem[] };
  computed_at: string;
};
