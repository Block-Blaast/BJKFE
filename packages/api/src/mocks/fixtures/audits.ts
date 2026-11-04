// 개발용 목업 — 명세서 F-AUDIT-06 예시(오링 P-20, 장부상 14개)를 의심 항목으로 옮겼다.
// 어떤 규칙에 걸렸는지는 명세서에 없어 F-AUDIT-05(실사 경과) 예시로 붙였다.
import type { AuditItem } from '../../types/briefing';

export const AUDIT_FIXTURES: AuditItem[] = [
  {
    id: 'au-oring-p20',
    part: { id: 'pt-oring-p20', name: '오링 P-20', unit: '개' },
    grade: '낮음',
    reason: '마지막 실사 후 90일이 지났어요.',
    ledger_qty: 14,
  },
];
