// 리포트 (W-09) — 임시 계약. 발주 기록은 F-APPROVAL-03·04, 검증 리포트는 F-SIM 을 따랐고 HTTP 형식은 명세서에 없다.
// 백엔드 OpenAPI 가 나오면 생성된 타입으로 교체하고, 이 파일을 지운다.
import type { ApprovalAction } from '../domain/review';

export type PurchaseOrder = {
  id: string;
  review_id: string | null; // 검토 없이 들어온 발주(백엔드)는 null
  part: { id: string; name: string; spec: string | null; unit: string };
  qty: number;
  supplier: string | null;
  unit_price: number | null;
  total: number | null;
  desired_date: string | null; // 납기 희망일 YYYY-MM-DD — 발주 문구에 들어간다
  // 백엔드 발주 목록(PO-01)은 승인 행동을 주지 않는다 — null
  action: ApprovalAction | null;
  approved_by: string;
  approved_at: string;
  // 승인 직후 서버가 만든다(WeasyPrint). 만드는 중이면 null.
  // 백엔드 PDF 는 로그인 토큰이 필요해 링크로 열 수 없다 — null 로 두고 화면이 검토 id 로 받아 연다(REV-07)
  pdf_url: string | null;
};

// 검증 하네스 결과 (F-SIM: 합성 데이터, 시나리오 주입, 평가, 정책 재생, 외부 충격 시나리오)
export type SimReport = {
  id: string;
  title: string;
  created_at: string;
  pdf_url: string | null;
};
