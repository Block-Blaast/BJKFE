// 외부 요인 알림 (F-EXT) — [추가] 임시 계약. 명세서에는 외부 요인 위험도(F-EXT-02)만 있고 알림 형식은 없다.
// 백엔드가 환율·해상운임을 받아 평소 변동폭 대비 급변(|z| ≥ 1)을 찾으면 하나 만든다.
// message 는 AI 가 쓴 요약이다. 화면은 계산하지 않고 받은 값을 보여 주기만 한다.
// TODO(F-EXT): 백엔드가 생기면 SSE(external.alert)로 받고 폴링을 끈다.
import type { RiskLevel } from '../domain/part';

export type ExternalFactor = '환율' | '해상운임' | '명절';

export type ExternalAlert = {
  id: string;
  factor: ExternalFactor;
  level: Exclude<RiskLevel, '정상'>; // 주의(|z| 1~2) · 높음(|z| ≥ 2)
  title: string; // '원/달러 환율 급등'
  message: string; // AI 요약 — 무엇이 바뀌었고 무엇을 하면 좋은지
  indicator: {
    label: string; // '원/달러'
    value: number; // 1425
    unit: string; // '원'
    change_pct: number; // 기준 기간 대비 변화율(%)
    period: string; // '최근 2일'
    z: number;
  };
  affected_part_ids: string[]; // 이 요인이 걸린 부품 (카테고리 기본값의 factors)
  related_review_ids: string[]; // 결정 대기 중인 영향 부품의 검토
  detected_at: string;
  is_mock: boolean;
};
