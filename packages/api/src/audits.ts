import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import {
  AUDIT_GRADE_ORDER,
  type AuditGrade,
  type AuditRule,
  type AuditStatus,
} from './domain/audit';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { CompanyMember } from './types/auth';
import type {
  AuditItem,
  AuditListFilters,
  CountRequestResult,
  MergeCandidate,
  MergeCandidatePart,
  MergeDecisionInput,
  MergeStatus,
  RequestAuditInput,
} from './types/audit';

// ---- 백엔드 형식 (BJK-AI-BE docs/api-spec/audit.md·merge.md, api/users.py) ----
// 규칙·등급·상태는 영문 코드로 온다. 화면은 도메인 상수(F-AUDIT-01~05, 높음/중간/낮음)를 쓰므로 여기서 바꾼다.
type BackendRule =
  'NEGATIVE_STOCK' | 'MAINTENANCE_OUT_MISMATCH' | 'PATTERN_DEVIATION' | 'SPIKE' | 'COUNT_OVERDUE';
type BackendLevel = 'high' | 'medium' | 'low';
type BackendFlagStatus = 'open' | 'count_requested' | 'closed';
type Evidence = Record<string, unknown>;

type BackendFlag = {
  id: string;
  part: { id: string; name: string };
  rule: BackendRule;
  level: BackendLevel;
  status: BackendFlagStatus;
  evidence: Evidence;
  related: { rule: BackendRule; level: BackendLevel; evidence: Evidence }[];
  created_at: string;
  updated_at: string;
};

type BackendCandidate = {
  id: string;
  score: number;
  reason: string;
  status: MergeStatus;
  part_a: MergeCandidatePart;
  part_b: MergeCandidatePart;
  representative_part_id: string | null;
  created_at: string;
};

type BackendStaff = {
  id: string;
  name: string;
  role: CompanyMember['role'];
  email: string | null;
  has_pin: boolean;
  active: boolean;
};

type Page<T> = { items: T[]; next_cursor: string | null };

const RULE: Record<BackendRule, AuditRule> = {
  NEGATIVE_STOCK: 'F-AUDIT-01',
  MAINTENANCE_OUT_MISMATCH: 'F-AUDIT-02',
  PATTERN_DEVIATION: 'F-AUDIT-03',
  SPIKE: 'F-AUDIT-04',
  COUNT_OVERDUE: 'F-AUDIT-05',
};
const GRADE: Record<BackendLevel, AuditGrade> = { high: '높음', medium: '중간', low: '낮음' };
const STATUS: Record<BackendFlagStatus, AuditStatus> = {
  open: 'open',
  count_requested: 'requested',
  closed: 'resolved',
};

// 목록은 커서로 끊겨 온다 — 화면은 한 번에 다 보여주므로 끝까지 받는다 (limit 최대 100)
const getAll = async <T>(path: string, params: Record<string, string> = {}) => {
  const items: T[] = [];
  let cursor: string | null = null;
  do {
    const search = new URLSearchParams({ ...params, limit: '100' });
    if (cursor) search.set('cursor', cursor);
    const page: Page<T> = await request<Page<T>>(`${path}?${search.toString()}`);
    items.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return items;
};

const num = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('ko-KR') : '?');

// 근거(evidence)는 규칙마다 키가 다르다. 서버가 문장을 주지 않아 여기서 만든다 (audit.md 규칙 표)
const reasonOf = (rule: BackendRule, e: Evidence) => {
  switch (rule) {
    case 'NEGATIVE_STOCK':
      return `기록상 재고가 ${num(e.stock_after)}까지 내려갔어요.`;
    case 'MAINTENANCE_OUT_MISMATCH':
      return `정비에 ${num(e.required_qty)}개가 필요했는데 연결된 출고는 ${num(e.linked_out_qty)}개예요.`;
    case 'PATTERN_DEVIATION':
      return `평소 주 ${typeof e.weekly_rate === 'number' ? e.weekly_rate.toFixed(1) : '?'}회 나가던 부품이 ${num(e.zero_weeks)}주째 출고가 없어요.`;
    case 'SPIKE':
      return `한 번에 ${num(e.qty)}개가 나갔어요. 이전 최대 ${num(e.past_max_qty)}개의 5배가 넘어요.`;
    case 'COUNT_OVERDUE':
      return e.last_counted_at
        ? `마지막 실사 후 ${num(e.days_since)}일, 입출고 ${num(e.movements_since)}건이 쌓였어요.`
        : `실사 기록이 없어요. 첫 기록 후 ${num(e.days_since)}일, 입출고 ${num(e.movements_since)}건이에요.`;
  }
};

const fromFlag = (f: BackendFlag): AuditItem => ({
  id: f.id,
  part: f.part,
  rule: RULE[f.rule],
  grade: GRADE[f.level],
  reason: reasonOf(f.rule, f.evidence),
  status: STATUS[f.status],
  created_at: f.created_at,
  updated_at: f.updated_at,
});

// 서버 status 필터는 값 하나만 받는다 — '처리 전'은 open·count_requested 를 따로 받아 합친다
export const getAudits = async ({ status }: AuditListFilters): Promise<AuditItem[]> => {
  const statuses: BackendFlagStatus[] =
    status === 'resolved'
      ? ['closed']
      : status === 'active'
        ? ['open', 'count_requested']
        : ['open', 'count_requested', 'closed'];
  const pages = await Promise.all(
    statuses.map((s) => getAll<BackendFlag>(ENDPOINTS.audits, { status: s })),
  );
  // 서버 정렬(등급 높은 순 → 최근 생성 순)을 합친 뒤에도 유지한다
  return pages
    .flat()
    .map(fromFlag)
    .sort(
      (a, b) =>
        AUDIT_GRADE_ORDER[a.grade] - AUDIT_GRADE_ORDER[b.grade] ||
        b.created_at.localeCompare(a.created_at),
    );
};

// open 항목만 요청할 수 있다(아니면 409). 문구에 장부 수량을 넣지 않는 블라인드 실사다
export const requestAudit = (id: string, input: RequestAuditInput) =>
  request<CountRequestResult>(ENDPOINTS.auditRequest(id), {
    method: 'POST',
    body: JSON.stringify(input),
  });

const fromCandidate = (c: BackendCandidate): MergeCandidate => ({
  id: c.id,
  score: c.score,
  status: c.status,
  parts: [c.part_a, c.part_b],
  representative_part_id: c.representative_part_id,
  created_at: c.created_at,
});

// status 를 비우면 결정 대기(open·count_requested)만 온다. 끝난 후보는 상태별로 따로 받는다(closed 는 화면에 없음)
export const getMergeCandidates = async (): Promise<MergeCandidate[]> => {
  const pages = await Promise.all([
    getAll<BackendCandidate>(ENDPOINTS.mergeCandidates),
    getAll<BackendCandidate>(ENDPOINTS.mergeCandidates, { status: 'merged' }),
    getAll<BackendCandidate>(ENDPOINTS.mergeCandidates, { status: 'different' }),
  ]);
  return pages.flat().map(fromCandidate);
};

// 병합·다른 부품·실사 후 결정을 한 엔드포인트로 보낸다. 이미 결정한 후보는 409
export const decideMerge = async (id: string, input: MergeDecisionInput) =>
  fromCandidate(
    await request<BackendCandidate>(ENDPOINTS.mergeDecision(id), {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );

// 우리 회사 직원 (AUTH-09). 사장님만 볼 수 있어 관리자는 403 을 받는다.
// 비활성 직원은 실사 담당자로 고를 수 없어(서버 404) 뺀다
export const getMembers = async (): Promise<CompanyMember[]> => {
  const { items } = await request<{ items: BackendStaff[] }>(ENDPOINTS.members);
  return items.filter((m) => m.active).map(({ id, name, role }) => ({ id, name, role }));
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
