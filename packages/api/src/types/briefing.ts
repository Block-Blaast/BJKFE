// 아침 브리핑 (M-04, F-NOTI-02 · BJK-AI-BE docs/api-spec/briefing.md DSH-01).
// 서버는 저장하지 않고 조회할 때 계산한다. 놓친 발주만 항목이 오고, 나머지는 건수만 온다.
import type { ReviewFlag, Verdict } from '../domain/review';

export type MissedOrder = {
  review_id: string;
  part: string | null; // 부품을 아직 못 정한 검토면 null
  verdict: Verdict | null; // 검토 중이면 판정이 없다
  flags: ReviewFlag[];
  t_deadline: string | null; // 발주 마감일 (검토 스냅샷 값)
  expected_loss: number;
};

export type Briefing = {
  date: string;
  computed_at: string;
  // 다섯 건수 중 하나라도 0이 아니면 true
  should_notify: boolean;
  // 놓친 발주: 결정을 기다리는 시스템 초안 — 예상 손실 큰 순 (F-MISSED-01)
  missed: { count: number; loss_total: number; items: MissedOrder[] };
  // 결정을 기다리는 직원 요청·재고 부족 초안 (놓친 발주 제외)
  pending_reviews: number;
  // 아직 실사를 요청하지 않은 열린 의심 항목
  count_needed: number;
  // 승인 후 24시간 넘게 주문 표시가 없거나, 납기를 넘겨도 다 들어오지 않은 발주 (F-MISSED-02)
  order_check_needed: number;
  // 예정일 + 2일이 지나도록 완료 기록이 없는 정비
  maintenance_check_needed: number;
};
