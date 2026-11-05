// 외부 요인 알림 목업 (F-EXT, [추가]) — 시연용 "원/달러 환율 급등".
// 실제로는 백엔드가 환율을 받아 급변을 찾고 AI 가 요약을 쓴다. 목업은 그 결과 한 건을 흉내 낸다.
// 화면을 연 뒤 ALERT_AFTER_MS 가 지나면 알림이 생긴다(새로고침하면 처음부터). 시연 중에 "갑자기 뜨는" 모습을 보이려는 것이다.
import { delay, http, HttpResponse } from 'msw';

import { CATEGORY_DEFAULTS } from '../domain/part';
import { ENDPOINTS } from '../endpoints';
import type { ExternalAlert } from '../types/external';
import type { Part } from '../types/part';
import type { Review } from '../types/review';

const NETWORK_DELAY = 200;
const ALERT_AFTER_MS = 15_000;

// 환율 영향이 큰 분류 — 카테고리 기본값(F-SETUP-03)에서 환율이 걸리고 수입 의존도가 높은 것
const FX_CATEGORIES = new Set(
  Object.entries(CATEGORY_DEFAULTS)
    .filter(([, d]) => d.factors.includes('환율') && d.importDependency === '높음')
    .map(([category]) => category),
);

export type ExternalSource = {
  parts: () => Part[];
  reviews: () => Review[];
};

const buildAlert = (src: ExternalSource, detectedAt: string): ExternalAlert => {
  const affected = src.parts().filter((p) => p.category && FX_CATEGORIES.has(p.category));
  const affectedIds = new Set(affected.map((p) => p.id));
  const related = src
    .reviews()
    .filter((r) => r.status === '검토완료' && affectedIds.has(r.part.id));
  const categories = [...FX_CATEGORIES].join(', ');
  const firstReview = related[0];
  return {
    id: 'ext-fx-usdkrw',
    factor: '환율',
    level: '높음',
    title: '원/달러 환율 급등',
    message:
      `원/달러 환율이 이틀 새 3.1% 올라 1,425원이 됐어요. 평소 변동폭의 2배가 넘는 움직임이에요. ` +
      `${categories} 같은 수입 부품 ${affected.length}개는 다음 발주부터 단가가 오를 수 있어요.` +
      (firstReview
        ? ` 결정을 기다리는 ${firstReview.part.name} 등 ${related.length}건은 지금 단가로 먼저 발주하는 게 유리해요.`
        : ''),
    indicator: {
      label: '원/달러',
      value: 1425,
      unit: '원',
      change_pct: 3.1,
      period: '최근 2일',
      z: 2.4,
    },
    affected_part_ids: affected.map((p) => p.id),
    related_review_ids: related.map((r) => r.id),
    detected_at: detectedAt,
    is_mock: true,
  };
};

export const createExternalHandlers = (src: ExternalSource) => {
  // 첫 요청 시각부터 잰다 — 목업이 켜진 시점이 화면을 연 시점이다
  let startedAt: number | null = null;
  return [
    http.get(ENDPOINTS.externalAlerts, async () => {
      await delay(NETWORK_DELAY);
      const now = Date.now();
      startedAt ??= now;
      if (now - startedAt < ALERT_AFTER_MS) return HttpResponse.json([]);
      const detectedAt = new Date(startedAt + ALERT_AFTER_MS).toISOString();
      return HttpResponse.json([buildAlert(src, detectedAt)]);
    }),
  ];
};
