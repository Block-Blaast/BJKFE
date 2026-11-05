import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import type { ReviewFlag, Verdict } from './domain/review';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { Briefing } from './types/briefing';

// ---- 백엔드 형식 (BJK-AI-BE api/briefing.py) — 판정·표시는 영문 코드로 온다 ----
type BackendBriefing = {
  date: string;
  generated_at: string;
  should_notify: boolean;
  missed_orders: {
    count: number;
    expected_loss_total: number;
    items: {
      review_id: string;
      part: string | null;
      verdict: string | null;
      flags: string[];
      t_deadline: string | null;
      expected_loss: number;
    }[];
  };
  pending_reviews: number;
  count_needed: number;
  order_check_needed: number;
  maintenance_check_needed: number;
};

const VERDICT: Record<string, Verdict | undefined> = {
  ok: '적정',
  revise: '수정 권고',
  hold: '보류',
};
const FLAG: Record<string, ReviewFlag | undefined> = { urgent: '긴급', caution: '주의' };

export const getBriefing = async (): Promise<Briefing> => {
  const b = await request<BackendBriefing>(ENDPOINTS.briefing);
  return {
    date: b.date,
    computed_at: b.generated_at,
    should_notify: b.should_notify,
    missed: {
      count: b.missed_orders.count,
      loss_total: b.missed_orders.expected_loss_total,
      items: b.missed_orders.items.map((m) => ({
        review_id: m.review_id,
        part: m.part,
        verdict: m.verdict ? (VERDICT[m.verdict] ?? null) : null,
        flags: m.flags.flatMap((f) => (FLAG[f] ? [FLAG[f]] : [])),
        t_deadline: m.t_deadline,
        expected_loss: m.expected_loss,
      })),
    },
    pending_reviews: b.pending_reviews,
    count_needed: b.count_needed,
    order_check_needed: b.order_check_needed,
    maintenance_check_needed: b.maintenance_check_needed,
  };
};

export const briefingQueries = {
  today: () =>
    queryOptions({
      queryKey: queryKeys.briefing.all,
      queryFn: getBriefing,
    }),
};
