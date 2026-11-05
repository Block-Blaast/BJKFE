// 장부 검증·숨은 재고 (BJK-AI-BE docs/api-spec/audit.md AUD-01·02, merge.md MAT-01·02).
// 화면이 쓰는 형식이다. 백엔드 응답(영문 규칙·등급·상태)은 audits.ts 가 이 형식으로 바꾼다.
import type { AuditGrade, AuditRule, AuditStatus } from '../domain/audit';

export type AuditItem = {
  id: string;
  part: { id: string; name: string };
  rule: AuditRule;
  grade: AuditGrade;
  reason: string; // 근거(evidence)를 사람이 읽는 문장으로
  status: AuditStatus;
  created_at: string;
  // 서버가 상태를 바꿀 때(실사 요청·종료) 함께 갱신하는 시각
  updated_at: string;
};

export type AuditListFilters = {
  status?: 'active' | 'resolved'; // active = 열림 + 실사 요청됨
};

export type RequestAuditInput = {
  assignee_id: string;
};

// 담당자 하루 한도(기본 2건)를 넘으면 예약(scheduled)되고 scheduled_for 에 보낼 시각이 온다
export type CountRequestResult = {
  count_request_id: string;
  status: 'sent' | 'scheduled';
  scheduled_for: string | null;
  message_preview: string;
};

// 숨은 재고·중복 병합 후보 (F-MATCH-03). 같은 카테고리에서 규격 일치 + 이름 유사.
// open·count_requested 는 결정 대기, merged·different·closed 는 끝난 후보
export type MergeStatus = 'open' | 'count_requested' | 'merged' | 'different' | 'closed';

export type MergeCandidatePart = {
  id: string;
  name: string;
  stock: number;
  last_counted_at: string | null; // 가장 최근 실사 응답 날짜
};

export type MergeCandidate = {
  id: string;
  score: number; // 0~1, 높을수록 같은 부품일 가능성이 크다
  status: MergeStatus;
  parts: [MergeCandidatePart, MergeCandidatePart];
  // 병합됐다면 대표 부품
  representative_part_id: string | null;
  created_at: string;
};

export type MergeDecisionInput =
  | { action: 'merge'; representative_part_id: string }
  | { action: 'different' }
  | { action: 'request_count' };
