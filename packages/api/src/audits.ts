import { queryOptions } from '@tanstack/react-query';

import { ApiError, itemsOf, request, USES_BACKEND } from './client';
import type { AuditGrade, AuditRule, AuditStatus } from './domain/audit';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { CompanyMember } from './types/auth';
import type {
  AuditItem,
  AuditListFilters,
  MergeCandidate,
  MergeInput,
  RequestAuditInput,
} from './types/audit';

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

// ---- 백엔드 장부 검증 형식 (AUD-01·02) ----
// 화면은 지금 AuditItem 형식을 그대로 쓰고, 여기서 백엔드 응답을 그 형식으로 바꾼다. 목업은 AuditItem 을 그대로 준다.
type BackendRule =
  'NEGATIVE_STOCK' | 'MAINTENANCE_OUT_MISMATCH' | 'PATTERN_DEVIATION' | 'SPIKE' | 'COUNT_OVERDUE';
type BackendFlagStatus = 'open' | 'count_requested' | 'closed';
type Evidence = Record<string, string | number | null>;

type BackendFlag = {
  id: string;
  part: { id: string; name: string };
  rule: BackendRule;
  level: 'high' | 'medium' | 'low';
  status: BackendFlagStatus;
  evidence: Evidence;
  created_at: string;
  updated_at: string;
};

const RULE: Record<BackendRule, AuditRule> = {
  NEGATIVE_STOCK: 'F-AUDIT-01',
  MAINTENANCE_OUT_MISMATCH: 'F-AUDIT-02',
  PATTERN_DEVIATION: 'F-AUDIT-03',
  SPIKE: 'F-AUDIT-04',
  COUNT_OVERDUE: 'F-AUDIT-05',
};
const GRADE: Record<BackendFlag['level'], AuditGrade> = {
  high: '높음',
  medium: '중간',
  low: '낮음',
};
const STATUS: Record<BackendFlagStatus, AuditStatus> = {
  open: 'open',
  count_requested: 'requested',
  closed: 'resolved',
};

// 백엔드는 부품 단위를 주지 않는다
const DEFAULT_UNIT = '개';

// 걸린 이유 문장은 백엔드 근거(evidence) 숫자로 화면이 만든다 — 백엔드는 장부 검증에 LLM 을 쓰지 않는다
const reasonOf = (rule: BackendRule, e: Evidence) => {
  switch (rule) {
    case 'NEGATIVE_STOCK':
      return `기록대로라면 재고가 ${e.stock_after}${DEFAULT_UNIT}가 돼요.`;
    case 'MAINTENANCE_OUT_MISMATCH':
      return `정비에 ${e.required_qty}${DEFAULT_UNIT}가 필요한데 출고 기록은 ${e.linked_out_qty}${DEFAULT_UNIT}예요.`;
    case 'PATTERN_DEVIATION':
      return `평소 자주 쓰던 부품인데 ${e.zero_weeks}주째 출고 기록이 없어요.`;
    case 'SPIKE':
      return `한 번에 ${e.qty}${DEFAULT_UNIT}를 썼어요. 지난 최대 ${e.past_max_qty}${DEFAULT_UNIT}의 5배가 넘어요.`;
    case 'COUNT_OVERDUE':
      return e.last_counted_at
        ? `마지막 실사 뒤 ${e.days_since}일, 입출고 ${e.movements_since}건이 쌓였어요.`
        : `실사 기록이 없고 첫 기록 뒤 ${e.days_since}일이 지났어요.`;
  }
};

const fromFlag = (f: BackendFlag): AuditItem => ({
  id: f.id,
  part: { ...f.part, unit: DEFAULT_UNIT },
  rule: RULE[f.rule],
  grade: GRADE[f.level],
  reason: reasonOf(f.rule, f.evidence),
  ledger_qty: null,
  status: STATUS[f.status],
  request: f.status === 'open' ? null : { assignee: null, requested_at: f.updated_at },
  result: null,
});

const GRADE_ORDER: Record<AuditGrade, number> = { 높음: 0, 중간: 1, 낮음: 2 };

const isBackendFlag = (a: AuditItem | BackendFlag): a is BackendFlag => 'level' in a;

// 화면의 '처리 전'은 열림 + 실사 요청됨이다. 백엔드는 상태를 하나씩 받아 두 번 부른다
export const getAudits = async ({ status }: AuditListFilters): Promise<AuditItem[]> => {
  if (!USES_BACKEND) {
    return request<AuditItem[]>(`${ENDPOINTS.audits}${status ? `?status=${status}` : ''}`);
  }
  const statuses: BackendFlagStatus[] =
    status === 'resolved' ? ['closed'] : ['open', 'count_requested'];
  const pages = await Promise.all(
    statuses.map((s) =>
      request<{ items: BackendFlag[] }>(`${ENDPOINTS.audits}?status=${s}&limit=100`),
    ),
  );
  return pages
    .flatMap((p) => itemsOf<AuditItem | BackendFlag>(p))
    .map((a) => (isBackendFlag(a) ? fromFlag(a) : a))
    .sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade]);
};

// 백엔드 응답은 요청 결과({ count_request_id, status, ... })라 화면은 목록을 다시 받아 그린다
export const requestAudit = (id: string, input: RequestAuditInput) =>
  post<unknown>(ENDPOINTS.auditRequest(id), input);

// ---- 실사 담당자 (직원 목록) ----
// 직원 목록 GET /v1/users 는 사장님만 볼 수 있다. 관리자는 403 이라 PIN 로그인 이름 목록(AUTH-03)으로 대신한다.
// 그 목록은 PIN 을 등록한 직원(현장 작업자)뿐이고 역할을 주지 않는다 — 작업자로 둔다.
type BackendUser = { id: string; name: string; role: CompanyMember['role']; active: boolean };

export const getMembers = async (): Promise<CompanyMember[]> => {
  if (!USES_BACKEND) return request<CompanyMember[]>(ENDPOINTS.members);
  try {
    const raw = await request<{ items: BackendUser[] }>(ENDPOINTS.members);
    return raw.items.filter((u) => u.active).map(({ id, name, role }) => ({ id, name, role }));
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 403) throw error;
    const me = await request<{ company: { code: string } }>(ENDPOINTS.me);
    const raw = await request<{ items: { user_id: string; name: string }[] }>(
      ENDPOINTS.companyMembers(me.company.code),
    );
    return raw.items.map((m) => ({ id: m.user_id, name: m.name, role: 'worker' }));
  }
};

// ---- 백엔드 병합 후보 형식 (MAT-01·02) ----
type BackendCandidateStatus = 'open' | 'count_requested' | 'merged' | 'different' | 'closed';
type BackendCandidatePart = { id: string; name: string; stock: number };
type BackendCandidate = {
  id: string;
  status: BackendCandidateStatus;
  part_a: BackendCandidatePart;
  part_b: BackendCandidatePart;
  representative_part_id: string | null;
};

// 실사 후 결정(count_requested)은 아직 고를 차례다. 한쪽이 다른 후보로 병합돼 닫힌 것(closed)은 다시 묻지 않는다
const CANDIDATE_STATUS: Record<BackendCandidateStatus, MergeCandidate['status']> = {
  open: 'open',
  count_requested: 'open',
  merged: 'merged',
  different: 'dismissed',
  closed: 'dismissed',
};

const fromCandidate = (c: BackendCandidate): MergeCandidate => ({
  id: c.id,
  spec: null,
  category: null,
  parts: [
    { id: c.part_a.id, name: c.part_a.name, stock: c.part_a.stock, unit: DEFAULT_UNIT },
    { id: c.part_b.id, name: c.part_b.name, stock: c.part_b.stock, unit: DEFAULT_UNIT },
  ],
  status: CANDIDATE_STATUS[c.status],
  primary_part_id: c.representative_part_id,
});

// 백엔드는 상태를 주지 않으면 결정 대기만 준다 — 화면 폴더(고를 차례·합침·다른 부품)를 채우려 나눠 받는다
export const getMergeCandidates = async (): Promise<MergeCandidate[]> => {
  if (!USES_BACKEND) return request<MergeCandidate[]>(ENDPOINTS.mergeCandidates);
  const pages = await Promise.all(
    ['', 'status=merged&', 'status=different&', 'status=closed&'].map((q) =>
      request<{ items: BackendCandidate[] }>(`${ENDPOINTS.mergeCandidates}?${q}limit=100`),
    ),
  );
  return pages.flatMap((p) => p.items.map(fromCandidate));
};

export const mergeParts = async (id: string, input: MergeInput) => {
  if (!USES_BACKEND) return post<MergeCandidate>(ENDPOINTS.merge(id), input);
  return fromCandidate(
    await post<BackendCandidate>(ENDPOINTS.mergeDecision(id), {
      action: 'merge',
      representative_part_id: input.primary_part_id,
    }),
  );
};

export const dismissMerge = async (id: string) => {
  if (!USES_BACKEND) return post<MergeCandidate>(ENDPOINTS.dismissMerge(id));
  return fromCandidate(
    await post<BackendCandidate>(ENDPOINTS.mergeDecision(id), { action: 'different' }),
  );
};

export const auditQueries = {
  list: (filters: AuditListFilters) =>
    queryOptions({
      queryKey: queryKeys.audits.list(filters),
      queryFn: () => getAudits(filters),
    }),
  mergeCandidates: () =>
    queryOptions({
      queryKey: queryKeys.mergeCandidates.all,
      queryFn: getMergeCandidates,
    }),
  members: () =>
    queryOptions({
      queryKey: queryKeys.auth.companyMembers(),
      queryFn: getMembers,
    }),
};
