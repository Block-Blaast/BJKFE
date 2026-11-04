// 발주 검토 응답 — 임시 계약.
// 기준은 명세서 F-REVIEW-07 출력 구조다. `// [추가]` 표시 필드는 화면에 필요해서 붙였고 명세서에 없다.
// 백엔드 OpenAPI 가 나오면 생성된 타입으로 교체하고, 이 파일을 지운다.
import type {
  ApprovalAction,
  CheckCode,
  CheckLevel,
  ReviewFlag,
  ReviewStatus,
  Verdict,
} from '../domain/review';

export type ReviewCheck = {
  code: CheckCode;
  level: CheckLevel;
  // 기호(Q, S, D95 …) → 값. 기호의 뜻은 domain/review.ts 의 FACTS.
  facts: Record<string, number | string>;
};

export type OrderLine = {
  qty: number;
  supplier: string | null;
  unit_price: number | null;
  total: number | null;
};

export type Proposal = OrderLine & {
  saving: number | null;
};

export type Review = {
  id: string; // [추가]
  status: ReviewStatus; // [추가]
  part: { id: string; name: string; unit: string }; // [추가]
  requester: 'worker' | 'manager' | 'owner' | 'system'; // [추가] 시스템 초안이면 'system'
  verdict: Verdict;
  flags: ReviewFlag[];
  checks: ReviewCheck[];
  original: OrderLine;
  proposal: Proposal;
  risk_if_not_ordered: {
    stockout_date: string | null;
    equipment: string[];
    // 설비 손실액이 등록되지 않았으면 null — 금액 대신 멈추는 설비만 보여준다 (F-SETUP-04)
    loss: number | null;
  };
  opinion: string; // [추가] 의견서 본문 (F-REVIEW-08)
  snapshot_id: string;
  computed_at: string;
};

export type ReviewDecisionInput = {
  action: ApprovalAction;
  // 반려는 필수, 원안 승인은 선택 (F-APPROVAL-01)
  reason?: string;
};
