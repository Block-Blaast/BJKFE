// 장부 검증·숨은 재고 — 임시 계약. 명세서 F-AUDIT-01~06, F-MATCH-03 을 화면 단위로 옮겼고 HTTP 형식은 명세서에 없다.
// 백엔드 OpenAPI 가 나오면 생성된 타입으로 교체하고, 이 파일을 지운다.
import type { AdjustReason, AuditGrade, AuditRule, AuditStatus } from '../domain/audit';

type PartRef = { id: string; name: string; unit: string };

export type AuditItem = {
  id: string;
  part: PartRef;
  rule: AuditRule;
  grade: AuditGrade;
  reason: string; // 걸린 이유를 사람이 읽는 문장으로
  // 장부상 재고. 백엔드는 블라인드 실사(F-AUDIT-06)라 주지 않는다 — null
  ledger_qty: number | null;
  status: AuditStatus;
  // 백엔드 목록은 담당자를 주지 않는다 — assignee null
  request: { assignee: { id: string; name: string } | null; requested_at: string } | null;
  // 종료 결과. 차이가 없으면 counted_qty === ledger_qty, adjust_reason null ("이상 없음")
  // 백엔드 목록은 실사 결과를 주지 않아 닫힌 항목도 null 이다
  result: {
    counted_qty: number;
    adjust_reason: AdjustReason | null;
    resolved_at: string;
  } | null;
};

export type AuditListFilters = {
  status?: 'active' | 'resolved'; // active = 열림 + 실사 요청됨
};

export type RequestAuditInput = {
  assignee_id: string;
};

// 숨은 재고·중복 병합 후보 (F-MATCH-03). 같은 카테고리에서 규격 일치 + 이름 유사.
export type MergeCandidate = {
  id: string;
  // 백엔드 후보(MAT-01)는 규격·카테고리를 주지 않는다 — null
  spec: string | null;
  category: string | null;
  parts: [PartRef & { stock: number }, PartRef & { stock: number }];
  status: 'open' | 'merged' | 'dismissed';
  // 병합됐다면 대표 부품
  primary_part_id: string | null;
};

export type MergeInput = {
  primary_part_id: string;
};
