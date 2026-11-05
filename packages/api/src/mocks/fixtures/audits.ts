// 개발·시연용 목업. 첫 항목씩은 명세서 예시이고, 나머지는 v2 가상 공장(factory.ts) 부품으로 만든 시연용이다.
// - 의심 항목: F-AUDIT-06 예시(오링 P-20, 장부상 14개). 어떤 규칙에 걸렸는지는 명세서에 없어 F-AUDIT-05(실사 경과)로 붙였다.
// - 병합 후보: F-REVIEW-10 볼트 예시(S 40, H 800). 숨은 쪽 부품 이름은 명세서에 없어 F-MATCH-01 의 동의어 예시("육각" ↔ "헥사")로 지었다.
import type { AuditItem, MergeCandidate } from '../../types/audit';

export const AUDIT_FIXTURES: AuditItem[] = [
  {
    id: 'au-oring-p20',
    part: { id: 'pt-oring-p20', name: '오링 P-20', unit: '개' },
    rule: 'F-AUDIT-05',
    grade: '낮음',
    reason: '마지막 실사 후 90일이 지났어요.',
    ledger_qty: 14,
    status: 'open',
    request: null,
    result: null,
  },
  // F-AUDIT-02: 정비 기록은 있는데 그날 출고가 없다
  {
    id: 'au-oilseal-tc30',
    part: { id: 'pt-oilseal-tc30', name: '오일씰 TC 30×47×7', unit: '개' },
    rule: 'F-AUDIT-02',
    grade: '높음',
    reason: '10월 30일 CNC 선반 2호기 정비에서 2개를 교체했는데 출고 기록이 없어요.',
    ledger_qty: 4,
    status: 'open',
    request: null,
    result: null,
  },
  // F-AUDIT-04: 하루 사이에 평소의 몇 배가 나갔다
  {
    id: 'au-fitting-pc8',
    part: { id: 'pt-fitting-pc8', name: '원터치 피팅 PC8-02', unit: '개' },
    rule: 'F-AUDIT-04',
    grade: '중간',
    reason: '11월 3일 하루에 14개가 나갔어요. 평소 하루 0~2개예요.',
    ledger_qty: 35,
    status: 'open',
    request: null,
    result: null,
  },
  // F-AUDIT-03: 생산량은 그대로인데 소모가 줄었다 — 기록 누락 의심
  {
    id: 'au-grease-2',
    part: { id: 'pt-grease-2', name: '그리스 #2 400g', unit: '개' },
    rule: 'F-AUDIT-03',
    grade: '중간',
    reason: '최근 3주 출고가 평소의 절반이에요. 기록이 빠졌을 수 있어요.',
    ledger_qty: 10,
    status: 'open',
    request: null,
    result: null,
  },
  {
    id: 'au-washer-m8',
    part: { id: 'pt-washer-m8', name: '평와셔 M8', unit: '개' },
    rule: 'F-AUDIT-05',
    grade: '낮음',
    reason: '마지막 실사 후 120일이 지났어요.',
    ledger_qty: 500,
    status: 'resolved',
    request: {
      assignee: { id: 'us-worker-1', name: '김민수' },
      requested_at: '2026-11-02T09:00:00+09:00',
    },
    result: {
      counted_qty: 480,
      adjust_reason: '기록 누락',
      resolved_at: '2026-11-02T11:20:00+09:00',
    },
  },
];

export const MERGE_FIXTURES: MergeCandidate[] = [
  {
    id: 'mg-bolt-m8x20',
    spec: 'M8×20',
    category: '볼트·너트',
    parts: [
      { id: 'pt-bolt-m8x20', name: '육각볼트 M8×20', unit: '개', stock: 40 },
      { id: 'pt-hexbolt-m8x20', name: '헥사볼트 M8x20', unit: '개', stock: 800 },
    ],
    status: 'open',
    primary_part_id: null,
  },
  // 맨 위 칸(A선반 4단 5칸)에 잊힌 옛 이름의 벨트
  {
    id: 'mg-belt-b50',
    spec: 'B-50',
    category: 'V벨트·전동벨트',
    parts: [
      { id: 'pt-vbelt-b50', name: 'V벨트 B-50', unit: '개', stock: 3 },
      { id: 'pt-belt-b50-old', name: '전동벨트 B-50', unit: '개', stock: 5 },
    ],
    status: 'open',
    primary_part_id: null,
  },
];
