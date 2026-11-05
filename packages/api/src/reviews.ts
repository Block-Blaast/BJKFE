import { queryOptions } from '@tanstack/react-query';

import { request, requestBlob, USES_BACKEND } from './client';
import type {
  ApprovalAction,
  CheckCode,
  CheckLevel,
  ReviewFlag,
  ReviewStatus,
  Verdict,
} from './domain/review';
import { ENDPOINTS } from './endpoints';
import { type BackendForecast, fromBackendForecast } from './parts';
import { queryKeys } from './queryKeys';
import type { StockForecast } from './types/forecast';
import type {
  OrderLine,
  Proposal,
  Review,
  ReviewDecisionInput,
  ReviewListFilters,
} from './types/review';

// ---- 백엔드 검토 형식 (BJK-AI-BE docs/api-spec/review-queries.md·reviews.md) ----
// 판정·체크·수정안은 검토 엔진이, 의견서 문장은 AI(LLM)가 쓴다(실패하면 양식 문장).
// 화면은 지금 Review 형식을 그대로 쓰고, 여기서 백엔드 응답을 그 형식으로 바꾼다. 목업은 Review 를 그대로 준다.
type BackendStatus = 'reviewing' | 'reviewed' | 'held' | 'approved' | 'closed' | 'expired';
type BackendVerdict = 'ok' | 'revise' | 'hold';
type BackendEntry = 'staff_request' | 'stock_draft' | 'missed_draft';
type BackendLine = {
  qty: number;
  supplier: { id: string; name: string } | null;
  unit_price: number | null;
  total: number;
};

type BackendItem = {
  id: string;
  entry: BackendEntry;
  part: string | null;
  status: BackendStatus;
  verdict: BackendVerdict | null;
  flags: string[];
  original_total: number | null;
  saving: number;
  created_at: string;
};

type BackendDetail = Omit<BackendItem, 'original_total' | 'saving'> & {
  requested_by: { type: 'user'; id: string; name: string } | null;
  checks: { code: CheckCode; level: string; facts: Record<string, number | string> }[];
  original: BackendLine | null;
  proposal: (BackendLine & { saving: number; no_order: boolean }) | null;
  risk_if_not_ordered: { stockout_date: string | null; equipment: string[]; loss: number } | null;
  opinion: { text: string; source: 'llm' | 'template'; verified: boolean } | null;
  snapshot: { id: string; hash: string } | null;
  computed_at: string | null;
  decision: { action: string; reason: string | null } | null;
  decided_at?: string | null;
};

const STATUS: Record<BackendStatus, ReviewStatus> = {
  reviewing: '검토중',
  reviewed: '검토완료',
  held: '보류',
  approved: '발주됨',
  closed: '종료',
  expired: '만료',
};
const VERDICT: Record<BackendVerdict, Verdict> = { ok: '적정', revise: '수정 권고', hold: '보류' };
const FLAG: Record<string, ReviewFlag | undefined> = { urgent: '긴급', caution: '주의' };
const LEVEL: Record<string, CheckLevel> = { urgent: '긴급', warning: '경고', info: '정보' };
const ORIGIN: Record<BackendEntry, Review['origin']> = {
  staff_request: 'request',
  stock_draft: 'stock_draft',
  missed_draft: 'missed_scan',
};
// 화면 행동 이름 ↔ 백엔드 action
const ACTION: Record<ApprovalAction, string> = {
  approveProposal: 'approve_proposal',
  approveOriginal: 'approve_original',
  editAndApprove: 'approve_edited',
  acceptNoOrder: 'accept_no_order',
  reject: 'reject',
};
const ACTION_BACK = Object.fromEntries(
  Object.entries(ACTION).map(([front, back]) => [back, front as ApprovalAction]),
);

// 백엔드는 부품 이름만 주고 id·단위는 주지 않는다 — 단위는 '개'로 둔다
const DEFAULT_UNIT = '개';

const line = (l: BackendLine | null): OrderLine => ({
  qty: l?.qty ?? 0,
  supplier: l?.supplier?.name ?? null,
  unit_price: l?.unit_price ?? null,
  total: l?.total ?? null,
});

const base = (r: BackendItem | BackendDetail) => ({
  id: r.id,
  status: STATUS[r.status],
  part: { id: '', name: r.part ?? '부품 확인 중', unit: DEFAULT_UNIT },
  origin: ORIGIN[r.entry],
  requested_at: r.created_at,
  // 검토 중이면 판정이 없다 — 화면은 판정 칸을 비우지 않으므로 보류로 보인다
  verdict: r.verdict ? VERDICT[r.verdict] : '보류',
  flags: r.flags.flatMap((f) => (FLAG[f] ? [FLAG[f]] : [])),
});

// 목록 항목은 총액·절감액만 온다. 화면 목록(검토함)이 쓰는 칸만 채운다
const fromItem = (r: BackendItem): Review => ({
  ...base(r),
  requester: r.entry === 'staff_request' ? 'worker' : 'system',
  decision: null,
  checks: [],
  original: { qty: 0, supplier: null, unit_price: null, total: r.original_total },
  proposal: { qty: 0, supplier: null, unit_price: null, total: null, saving: r.saving || null },
  risk_if_not_ordered: { stockout_date: null, equipment: [], loss: null },
  opinion: '',
  snapshot_id: '',
  computed_at: r.created_at,
});

// 아침 브리핑(DSH-01)의 놓친 발주 항목 — 검토 목록 항목과 같은 칸만 채운다
export type BriefingMissedItem = {
  review_id: string;
  part: string | null;
  verdict: BackendVerdict | null;
  flags: string[];
  expected_loss: number | null;
};

export const reviewFromBriefing = (m: BriefingMissedItem, at: string): Review => {
  const review = fromItem({
    id: m.review_id,
    entry: 'missed_draft',
    part: m.part,
    status: 'reviewed',
    verdict: m.verdict,
    flags: m.flags,
    original_total: null,
    saving: 0,
    created_at: at,
  });
  return {
    ...review,
    risk_if_not_ordered: { ...review.risk_if_not_ordered, loss: m.expected_loss },
  };
};

const fromDetail = (r: BackendDetail): Review => {
  const proposal: Proposal = r.proposal
    ? {
        ...line(r.proposal),
        qty: r.proposal.no_order ? 0 : r.proposal.qty,
        saving: r.proposal.saving || null,
      }
    : { ...line(r.original), saving: null };
  return {
    ...base(r),
    requester: r.requested_by ? 'worker' : 'system',
    decision: r.decision
      ? {
          action: ACTION_BACK[r.decision.action] ?? 'reject',
          reason: r.decision.reason,
          decided_at: r.decided_at ?? r.computed_at ?? r.created_at,
        }
      : null,
    checks: r.checks.map((c) => ({
      code: c.code,
      level: LEVEL[c.level] ?? '정보',
      facts: c.facts,
    })),
    original: line(r.original),
    proposal,
    risk_if_not_ordered: {
      stockout_date: r.risk_if_not_ordered?.stockout_date ?? null,
      equipment: r.risk_if_not_ordered?.equipment ?? [],
      loss: r.risk_if_not_ordered?.loss || null,
    },
    opinion: r.opinion?.text ?? '검토가 끝나면 의견서가 나와요.',
    opinion_source: r.opinion?.source,
    snapshot_id: r.snapshot?.hash ?? '',
    computed_at: r.computed_at ?? r.created_at,
  };
};

const isBackendItem = (r: unknown): r is BackendItem | BackendDetail =>
  typeof r === 'object' && r !== null && 'entry' in r;

// 화면 필터 → 백엔드 쿼리. 결정 대기는 reviewed, 판정은 영문 값. 최소 총액은 백엔드에 없어 받은 뒤 거른다
const BACK_VERDICT = Object.fromEntries(Object.entries(VERDICT).map(([k, v]) => [v, k]));

const toSearch = ({ status, verdict, urgent, minTotal }: ReviewListFilters) => {
  const params = new URLSearchParams();
  if (USES_BACKEND) {
    if (status === 'pending') params.set('status', 'reviewed');
    if (verdict) params.set('verdict', BACK_VERDICT[verdict]);
    if (urgent) params.set('urgent', 'true');
    params.set('limit', '100');
  } else {
    if (status) params.set('status', status);
    if (verdict) params.set('verdict', verdict);
    if (urgent) params.set('urgent', '1');
    if (minTotal) params.set('min_total', String(minTotal));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

const listOf = (raw: Review[] | { items: BackendItem[] }, minTotal?: number): Review[] => {
  if (Array.isArray(raw)) return raw;
  const list = raw.items.map(fromItem);
  return minTotal ? list.filter((r) => (r.original.total ?? 0) >= minTotal) : list;
};

export const getReviews = async (filters: ReviewListFilters) =>
  listOf(
    await request<Review[] | { items: BackendItem[] }>(`${ENDPOINTS.reviews}${toSearch(filters)}`),
    filters.minTotal,
  );

// 백엔드는 "내 요청"을 목록의 mine=true 로 준다
export const getMyRequests = async () =>
  listOf(
    await request<Review[] | { items: BackendItem[] }>(
      USES_BACKEND ? `${ENDPOINTS.reviews}?mine=true&limit=100` : ENDPOINTS.myRequests,
    ),
  );

export const getReview = async (id: string) => {
  const raw = await request<Review | BackendDetail>(ENDPOINTS.review(id));
  return isBackendItem(raw) ? fromDetail(raw as BackendDetail) : raw;
};

// 같은 스냅샷에 같은 행동이면 같은 키 — 두 번 눌러도, 재시도해도 서버가 한 번만 처리한다 (F-APPROVAL-02).
export const reviewDecisionKey = (
  review: Pick<Review, 'id' | 'snapshot_id'>,
  input: ReviewDecisionInput,
) => `${review.id}:${review.snapshot_id}:${input.action}`;

// 백엔드 결정 응답은 발주 기록이라, 결정한 뒤 검토를 다시 받아 화면에 돌려준다
export const decideReview = async (
  review: Pick<Review, 'id' | 'snapshot_id'>,
  input: ReviewDecisionInput,
): Promise<Review> => {
  const raw = await request<Review | object>(ENDPOINTS.reviewDecision(review.id), {
    method: 'POST',
    headers: { 'Idempotency-Key': reviewDecisionKey(review, input) },
    body: JSON.stringify(
      USES_BACKEND ? { action: ACTION[input.action], reason: input.reason } : input,
    ),
  });
  return USES_BACKEND ? getReview(review.id) : (raw as Review);
};

// 백엔드 예측선(#258)은 오늘부터 8주 일별 값만 준다 — 실적선은 없다
export const getReviewForecast = async (id: string): Promise<StockForecast> => {
  const raw = await request<StockForecast | BackendForecast>(ENDPOINTS.reviewForecast(id));
  return 'days' in raw ? fromBackendForecast(raw, DEFAULT_UNIT) : raw;
};

// 결재용 PDF (REV-07) — 승인(발주됨) 뒤에만 있다. 로그인 토큰이 필요해 파일로 받아 새 탭에 연다
export const openReviewPdf = async (id: string) => {
  const blob = await requestBlob(ENDPOINTS.reviewPdf(id));
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const reviewQueries = {
  list: (filters: ReviewListFilters) =>
    queryOptions({
      queryKey: queryKeys.reviews.list(filters),
      queryFn: () => getReviews(filters),
    }),
  mine: () =>
    queryOptions({
      queryKey: queryKeys.reviews.mine(),
      queryFn: getMyRequests,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.reviews.detail(id),
      queryFn: () => getReview(id),
    }),
  forecast: (id: string) =>
    queryOptions({
      queryKey: queryKeys.reviews.forecast(id),
      queryFn: () => getReviewForecast(id),
    }),
};
