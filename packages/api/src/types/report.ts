// 리포트 (W-09) — 임시 계약. 발주 기록은 F-APPROVAL-03·04, 검증 리포트는 F-SIM 을 따랐고 HTTP 형식은 명세서에 없다.
// 백엔드 OpenAPI 가 나오면 생성된 타입으로 교체하고, 이 파일을 지운다.
import type { ApprovalAction } from '../domain/review';

export type PurchaseOrder = {
  id: string;
  review_id: string;
  part: { id: string; name: string; spec: string | null; unit: string };
  qty: number;
  supplier: string | null;
  unit_price: number | null;
  total: number | null;
  desired_date: string | null; // 납기 희망일 YYYY-MM-DD — 발주 문구에 들어간다
  action: ApprovalAction;
  approved_by: string;
  approved_at: string;
  // 승인 직후 서버가 만든다(WeasyPrint). 만드는 중이면 null
  pdf_url: string | null;
};

// 검증 하네스 결과 (F-SIM: 합성 데이터, 시나리오 주입, 평가, 정책 재생, 외부 충격 시나리오)
export type SimReport = {
  id: string;
  title: string;
  created_at: string;
  pdf_url: string | null;
};
