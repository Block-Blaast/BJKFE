import { queryOptions } from '@tanstack/react-query';

import { getAudits } from './audits';
import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import { type BriefingMissedItem, getReviews, reviewFromBriefing } from './reviews';
import type { Briefing } from './types/briefing';

// ---- 백엔드 브리핑 형식 (DSH-01) ----
// 백엔드는 놓친 발주 항목과 나머지 건수만 준다. 화면은 검토 대기·실사 필요도 목록으로 그려서,
// 검토 목록(REV-01)과 의심 항목(AUD-01)을 함께 받아 채운다. 목업은 Briefing 을 그대로 준다.
type BackendBriefing = {
  generated_at: string;
  missed_orders: { expected_loss_total: number | null; items: BriefingMissedItem[] };
};

const isBackendBriefing = (raw: Briefing | BackendBriefing): raw is BackendBriefing =>
  'missed_orders' in raw;

export const getBriefing = async (): Promise<Briefing> => {
  const raw = await request<Briefing | BackendBriefing>(ENDPOINTS.briefing);
  if (!isBackendBriefing(raw)) return raw;
  const [pending, audits] = await Promise.all([
    getReviews({ status: 'pending' }),
    getAudits({ status: 'active' }),
  ]);
  return {
    missed: {
      items: raw.missed_orders.items.map((m) => reviewFromBriefing(m, raw.generated_at)),
      loss_total: raw.missed_orders.expected_loss_total || null,
    },
    pending_reviews: { items: pending.filter((r) => r.origin !== 'missed_scan') },
    // 브리핑의 '실사 필요'는 아직 실사를 요청하지 않은 항목이다 (count_needed)
    audits: { items: audits.filter((a) => a.status === 'open') },
    computed_at: raw.generated_at,
  };
};

export const briefingQueries = {
  today: () =>
    queryOptions({
      queryKey: queryKeys.briefing.all,
      queryFn: getBriefing,
    }),
};
