// 부품·근거 계산 도메인 상수 (F-SETUP-03, F-ANAL-01·02, F-EXT-02)

export const ABC_CLASSES = ['A', 'B', 'C'] as const;
export type AbcClass = (typeof ABC_CLASSES)[number];

// 수요 패턴 (F-ANAL-02, ADI·CV² 기준). 라벨은 임시 번역 — 현장 용어가 정해지면 바꾼다.
export const DEMAND_PATTERNS = {
  smooth: '규칙적',
  erratic: '변동 큼',
  intermittent: '간헐적',
  lumpy: '간헐·변동 큼',
  insufficient: '데이터 부족',
} as const;
export type DemandPattern = keyof typeof DEMAND_PATTERNS;

// 카테고리 기본값 (F-SETUP-03 표)
export const CATEGORIES = ['베어링', 'V벨트·전동벨트', '볼트·너트', '절삭유·윤활유'] as const;
export type Category = (typeof CATEGORIES)[number];

// 외부 요인 위험도 (F-EXT-02: |z| < 1 정상, 1~2 주의, 2 이상 높음)
export const RISK_LEVELS = ['정상', '주의', '높음'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

// 원장 기록 종류 (F-LEDGER-01)
export const MOVEMENT_TYPES = { IN: '입고', OUT: '출고', ADJUST: '실사조정' } as const;
export type MovementType = keyof typeof MOVEMENT_TYPES;
