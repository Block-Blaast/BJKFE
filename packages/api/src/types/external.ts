// 외부 요인 (F-EXT) — 백엔드 DSH-03 GET /v1/external/status (BJK-AI-BE docs/api-spec/external.md).
// 위험도는 백엔드 새벽 배치가 지표의 평소 변동폭 대비 z 로 계산한다(LLM 아님). r = min(max(0, z), 4),
// 등급은 r 1 미만 normal, 2 미만 caution, 그 이상 high.
// TODO(F-EXT): 급변을 바로 알리는 이벤트(SSE)·알림 종류가 백엔드에 생기면 폴링을 그것으로 바꾼다.
import type { RiskLevel } from '../domain/part';

export type ExternalLevel = 'normal' | 'caution' | 'high';

export type ExternalIndicator = {
  code: string; // 'USDKRW' · 'FREIGHT'
  name: string; // '원/달러 환율'
  series: 'lead' | 'price'; // 납기 요인 · 가격 요인
  value: number;
  as_of: string;
  z: number | null;
  r: number;
  level: ExternalLevel;
};

export type ExternalStatus = {
  indicators: ExternalIndicator[];
  upcoming_holidays: {
    name: string;
    start: string;
    end: string;
    scope: 'KR' | 'CN' | 'supplier';
  }[];
  categories: { id: string; name: string; r_lead: number; r_price: number; level: ExternalLevel }[];
  updated_at: string | null;
  stale: boolean;
};

// 화면이 3D 위에 띄우는 알림 한 건 — 위 응답에서 주의·높음인 지표마다 만든다(@bjk/api/external alertsFromStatus)
export type ExternalAlert = {
  id: string; // 지표 코드
  level: Exclude<RiskLevel, '정상'>;
  title: string; // '원/달러 환율 급등'
  message: string;
  indicator: ExternalIndicator;
  categories: string[]; // 이 요인 때문에 위험도가 오른 부품 분류
};
