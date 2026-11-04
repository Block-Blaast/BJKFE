// 개발용 목업 — 명세서 예시만 옮겼다.
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
];
