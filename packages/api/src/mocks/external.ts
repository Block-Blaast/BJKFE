// 외부 요인 현황 목업 (DSH-03 GET /v1/external/status) — 백엔드와 같은 형식이다.
// 시연용으로 화면을 연 뒤 SPIKE_AFTER_MS 가 지나면 원/달러 환율이 급등한(z 2.4, high) 값으로 바뀐다(새로고침하면 처음부터).
// 실제 백엔드에서는 새벽 배치가 지표를 갱신하고, 외부 충격 스위치(DEV-02)로 해상운임을 high 로 만들 수 있다.
import { delay, http, HttpResponse } from 'msw';

import { CATEGORIES, CATEGORY_DEFAULTS } from '../domain/part';
import { ENDPOINTS } from '../endpoints';
import type { ExternalIndicator, ExternalLevel, ExternalStatus } from '../types/external';

const NETWORK_DELAY = 200;
const SPIKE_AFTER_MS = 15_000;

const levelOf = (r: number): ExternalLevel => (r < 1 ? 'normal' : r < 2 ? 'caution' : 'high');

const status = (spiked: boolean, asOf: string): ExternalStatus => {
  const fxR = spiked ? 2.4 : 0.4;
  const freightR = 0.6;
  const indicators: ExternalIndicator[] = [
    {
      code: 'USDKRW',
      name: '원/달러 환율',
      series: 'price',
      value: spiked ? 1425 : 1382,
      as_of: asOf,
      z: fxR,
      r: fxR,
      level: levelOf(fxR),
    },
    {
      code: 'FREIGHT',
      name: '컨테이너 운임지수',
      series: 'lead',
      value: 2140,
      as_of: asOf,
      z: freightR,
      r: freightR,
      level: levelOf(freightR),
    },
  ];
  // 카테고리 기본값(F-SETUP-03)의 요인으로 카테고리 위험도를 정한다. 환율은 수입 의존도가 높은 분류만 크게 받는다
  const categories = CATEGORIES.map((name, i) => {
    const d = CATEGORY_DEFAULTS[name];
    const rPrice = d.factors.includes('환율') ? (d.importDependency === '높음' ? fxR : fxR / 3) : 0;
    const rLead = d.factors.includes('해상운임') ? freightR : 0;
    return {
      id: `cat-${i}`,
      name,
      r_lead: rLead,
      r_price: rPrice,
      level: levelOf(Math.max(rLead, rPrice)),
    };
  });
  return {
    indicators,
    upcoming_holidays: [],
    categories,
    updated_at: `${asOf}T03:00:00+09:00`,
    stale: false,
  };
};

export const createExternalHandlers = () => {
  // 첫 요청 시각부터 잰다 — 목업이 켜진 시점이 화면을 연 시점이다
  let startedAt: number | null = null;
  return [
    http.get(ENDPOINTS.externalStatus, async () => {
      await delay(NETWORK_DELAY);
      const now = Date.now();
      startedAt ??= now;
      const today = new Date(now).toISOString().slice(0, 10);
      return HttpResponse.json(status(now - startedAt >= SPIKE_AFTER_MS, today));
    }),
  ];
};
