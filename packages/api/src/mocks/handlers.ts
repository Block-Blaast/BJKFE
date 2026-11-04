// 개발용 MSW 핸들러 — 백엔드 없이 화면을 만들기 위한 것. 판정·매칭 로직을 흉내 내지 않고 고정 데이터만 돌려준다.
// 채팅 해석은 몇 가지 문장 패턴만 알아듣는다(실제 추출은 서버의 LLM, F-CHAT-01).
import { delay, http, HttpResponse } from 'msw';

import { AUDIT_GRADE_ORDER } from '../domain/audit';
import { APPROVAL_ACTIONS } from '../domain/review';
import { ENDPOINTS } from '../endpoints';
import type {
  ChatCard,
  ChatInboxItem,
  ChatIntent,
  ChatTurn,
  ConfirmPendingInput,
  SendChatInput,
} from '../types/chat';
import type {
  AcceptInviteInput,
  AuthResult,
  EmailLoginInput,
  PinLoginInput,
  SignupInput,
} from '../types/auth';
import type { AuditItem, MergeCandidate, MergeInput, RequestAuditInput } from '../types/audit';
import type { Briefing } from '../types/briefing';
import type { Review, ReviewDecisionInput } from '../types/review';
import { AUDIT_FIXTURES, MERGE_FIXTURES } from './fixtures/audits';
import { MOCK_COMPANY, MOCK_INVITES, MOCK_MEMBERS, MOCK_OWNER } from './fixtures/auth';
import { PART_FIXTURES, type MockPart } from './fixtures/parts';
import type { StockForecast, StockPoint } from '../types/forecast';
import type { Part, StockMovement } from '../types/part';
import { REVIEW_FIXTURES } from './fixtures/reviews';

const NETWORK_DELAY = 400;
const PENDING_TTL_MS = 10 * 60 * 1000;
const PAST_MAX_QTY = 200;
const WARNING_MULTIPLIER = 5;

// 브라우저 탭 하나 동안만 유지되는 상태. 새로고침하면 초기화된다.
const reviews = new Map(REVIEW_FIXTURES.map((r) => [r.id, structuredClone(r)]));
const decisions = new Map<string, Review>();
const stock = new Map(PART_FIXTURES.map((p) => [p.part_id, p.stock]));

// ---- 원장·부품 (F-LEDGER, F-MATCH-03, W-04·05) ----
// 초기 재고는 엑셀 이관 때 실사조정(ADJUST)으로 들어간다 (F-SETUP-01). 이관 시각은 목업용으로 정했다.
const IMPORTED_AT = '2026-11-01T09:00:00+09:00';
const ledger = new Map<string, StockMovement[]>(
  PART_FIXTURES.map((p) => [
    p.part_id,
    p.stock === null
      ? []
      : [
          {
            id: `mv-init-${p.part_id}`,
            type: 'ADJUST',
            qty: p.stock,
            message: null,
            reason: '초기 재고 (엑셀 이관)',
            created_at: IMPORTED_AT,
          },
        ],
  ]),
);
const pendingText = new Map<string, string>();
const mergedInto = new Map<string, string>();
const dismissedPairs = new Set<string>();

const pairKey = (a: string, b: string) => [a, b].sort().join('|');
const normalizeSpec = (spec: string | null) =>
  spec?.toLowerCase().replace(/×/g, 'x').replace(/\s/g, '') ?? null;

const recordMovement = (
  partId: string,
  type: StockMovement['type'],
  qty: number,
  pendingId: string,
  reason: StockMovement['reason'] = null,
) => {
  ledger.get(partId)?.push({
    id: `mv-${crypto.randomUUID()}`,
    type,
    qty,
    message: pendingText.get(pendingId) ?? null,
    reason,
    created_at: new Date().toISOString(),
  });
  pendingText.delete(pendingId);
};

// ---- 재고 예측 (목업) ----
// 실제 예측은 서버의 8주 경로 시뮬레이션(F-ANAL-07)이다. 목업은 화면을 그리기 위해 기존 지표로 단순 계산한다:
// - 미발주: 오늘 재고에서 소진 예상일(t_out)까지 직선, 없으면 월 소모량(m)으로 감소. 입고 예정(O)은 도착일에 더한다.
// - 발주 시: 위 선에 발주 수량을 오늘 + 늦을 때 납기(LT90, 없으면 LT50) 날에 더한다. 납기를 모르면 그리지 않는다.
const DAY_MS = 24 * 60 * 60 * 1000;
const kstDate = (iso: string | number) =>
  new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const addDays = (ymd: string, days: number) =>
  new Date(Date.parse(`${ymd}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
const round1 = (n: number) => Math.round(n * 10) / 10;

const buildForecast = (p: MockPart, orderQty: number | null): StockForecast => {
  const view = partView(p);
  const today = kstDate(Date.now());
  const entries = [...(ledger.get(p.part_id) ?? [])].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  );
  const start = entries.length ? kstDate(entries[0].created_at) : today;
  const actual: StockPoint[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const qty = entries
      .filter((e) => kstDate(e.created_at) <= d)
      .reduce((sum, e) => sum + e.qty, 0);
    actual.push({ date: d, qty });
  }
  const current = view.stock;
  const {
    m,
    t_out: tOut,
    LT50,
    LT90,
    reorder_point: reorderPoint,
    t_deadline: deadline,
  } = p.metrics;
  const daily =
    tOut && tOut > today ? current / daysBetween(today, tOut) : m !== null ? m / 30 : null;
  const horizon = Math.min(56, Math.max(28, tOut ? daysBetween(today, tOut) + 7 : 0));
  const lead = LT90 ?? LT50;

  const project = (extra: { date: string; qty: number }[]) => {
    if (daily === null) return null;
    const points: StockPoint[] = [];
    let qty = current;
    for (let i = 0; i <= horizon; i++) {
      const date = addDays(today, i);
      if (i > 0) qty = Math.max(0, qty - daily);
      for (const add of extra) if (add.date === date && i > 0) qty += add.qty;
      points.push({ date, qty: round1(qty) });
    }
    return points;
  };
  const incoming = p.incoming && p.incoming.eta > today ? [p.incoming] : [];
  const orderArrives =
    orderQty && lead !== null ? [{ date: addDays(today, lead), qty: orderQty }] : null;

  return {
    unit: p.unit,
    today,
    computed_at: p.metrics.computed_at,
    reorder_point: reorderPoint,
    deadline,
    order_qty: orderArrives ? orderQty : null,
    actual,
    without_order: project(incoming.map((x) => ({ date: x.eta, qty: x.qty }))),
    with_order: orderArrives
      ? project([...incoming.map((x) => ({ date: x.eta, qty: x.qty })), ...orderArrives])
      : null,
    is_mock: true,
  };
};

// 병합 부품은 원장을 고치지 않고 재고 계산 때 대표 부품에 합산한다 (F-LEDGER-02, F-MATCH-03)
const partView = (p: MockPart): Part => {
  const merged = PART_FIXTURES.filter((q) => mergedInto.get(q.part_id) === p.part_id);
  const own = (q: MockPart) => stock.get(q.part_id) ?? 0;
  const spec = normalizeSpec(p.spec);
  const hidden = PART_FIXTURES.filter(
    (q) =>
      q.part_id !== p.part_id &&
      spec !== null &&
      normalizeSpec(q.spec) === spec &&
      !mergedInto.has(q.part_id) &&
      !dismissedPairs.has(pairKey(p.part_id, q.part_id)),
  );
  return {
    id: p.part_id,
    name: p.part_name,
    spec: p.spec,
    category: p.category,
    unit: p.unit,
    stock: own(p) + merged.reduce((sum, q) => sum + own(q), 0),
    incoming: p.incoming,
    hidden_stock: hidden.reduce((sum, q) => sum + own(q), 0),
    risk: null,
    location: p.location,
    supplier: p.supplier,
    aliases: merged.map((q) => q.part_name),
    metrics: p.metrics,
  };
};
const pending = new Map<string, Extract<ChatCard, { pending_id: string }>>();
const seenMessages = new Map<string, ChatTurn>();

const DECIDED_STATUS: Record<ReviewDecisionInput['action'], Review['status']> = {
  approveProposal: '발주됨',
  approveOriginal: '발주됨',
  editAndApprove: '발주됨',
  acceptNoOrder: '종료',
  reject: '종료',
};

const findPart = (text: string): MockPart | undefined => {
  const normalized = text.toLowerCase().replace(/\s/g, '');
  return PART_FIXTURES.find((p) => p.keywords.some((k) => normalized.includes(k)));
};

const parseQty = (text: string) => {
  const match = text.match(/(\d[\d,]*)\s*(개|ea|pcs)?/i);
  return match ? Number(match[1].replaceAll(',', '')) : null;
};

const parseIntent = (text: string): ChatIntent => {
  if (/세어\s*보니|실사/.test(text)) return '실사';
  if (/몇\s*개|있어\?|남았/.test(text)) return '조회';
  if (/시켜|주문|발주/.test(text)) return '발주요청';
  if (/입고|들어왔|받았/.test(text)) return '입고';
  if (/씀|썼|사용|출고|빼/.test(text)) return '출고';
  return '기타';
};

const expiresAt = () => new Date(Date.now() + PENDING_TTL_MS).toISOString();

const partRef = (p: MockPart) => ({ part_id: p.part_id, part_name: p.part_name, spec: p.spec });

const replyToChat = ({ text }: SendChatInput): ChatTurn => {
  const intent = parseIntent(text);
  const part = findPart(text);
  const qty = parseQty(text);

  if (intent === '기타') {
    return { reply: '기록, 조회, 발주 요청을 도와드려요. 예: "V벨트 2개 씀", "볼트 몇 개 있어?"' };
  }

  if (intent === '조회') {
    if (!part) return { reply: '어떤 부품인지 알려주세요. 예: "V벨트 몇 개 있어?"' };
    const current = stock.get(part.part_id);
    return {
      reply:
        current === null || current === undefined
          ? `${part.part_name} 재고 기록이 아직 없어요.`
          : `${part.part_name} 재고 ${current}${part.unit} 있어요. (11월 5일 03:00 계산 기준)`,
    };
  }

  if (intent === '발주요청') {
    const review = REVIEW_FIXTURES.find((r) => r.part.id === part?.part_id);
    if (!review) return { reply: '어떤 부품을 몇 개 시킬지 알려주세요.' };
    return { reply: '검토해서 사장님께 올렸어요. 결정되면 알려드릴게요.', review_id: review.id };
  }

  if (qty === null) {
    return { reply: '몇 개인지 알려주세요.' };
  }

  // 실사 응답 (F-CHAT-05): 장부와 차이를 보여주고, 차이가 있으면 사유를 고르게 한다
  const ledger = part ? stock.get(part.part_id) : null;
  if (intent === '실사' && part && ledger !== null && ledger !== undefined) {
    const card: ChatCard = {
      type: 'count',
      pending_id: crypto.randomUUID(),
      intent,
      qty,
      unit: part.unit,
      part: partRef(part),
      ledger_qty: ledger,
      expires_at: expiresAt(),
    };
    pending.set(card.pending_id, card);
    const diff = qty - ledger;
    return {
      reply:
        diff === 0
          ? `장부와 같아요(${ledger}${part.unit}). 이상 없음으로 기록할까요?`
          : `장부(${ledger}${part.unit})보다 ${Math.abs(diff)}${part.unit} ${diff < 0 ? '적어요' : '많아요'}. 사유를 골라 주세요.`,
      card,
    };
  }

  // "베어링"처럼 형번 없이 말하면 후보를 고르게 한다
  if (!part && /베어링/.test(text)) {
    const card: ChatCard = {
      type: 'select',
      pending_id: crypto.randomUUID(),
      intent,
      qty,
      unit: '개',
      part_text: '베어링',
      candidates: PART_FIXTURES.filter((p) => p.part_name.includes('베어링')).map(partRef),
      expires_at: expiresAt(),
    };
    pending.set(card.pending_id, card);
    return { reply: '어떤 베어링인가요?', card };
  }

  if (!part) {
    const partText = text.replace(/(\d[\d,]*)\s*(개|ea|pcs)?.*/i, '').trim() || text;
    return {
      reply: '등록되지 않은 부품이에요. 임시로 기록하고 관리자에게 등록을 요청할게요.',
      card: { type: 'unregistered', intent, part_text: partText, qty, unit: '개' },
    };
  }

  const base = {
    pending_id: crypto.randomUUID(),
    intent,
    qty,
    unit: part.unit,
    expires_at: expiresAt(),
  };
  const card: ChatCard =
    qty > PAST_MAX_QTY * WARNING_MULTIPLIER
      ? { ...base, type: 'warning', part: partRef(part), past_max: PAST_MAX_QTY }
      : { ...base, type: 'confirm', part: partRef(part) };
  pending.set(card.pending_id, card);
  return {
    reply:
      card.type === 'warning'
        ? `${qty.toLocaleString('ko-KR')}${part.unit} 맞나요?`
        : '이렇게 기록할까요?',
    card,
  };
};

// ---- 인증 (F-AUTH-01·02) ----
const PIN_MAX_FAILS = 5;
const PIN_LOCK_MS = 10 * 60 * 1000;
const members = MOCK_MEMBERS.map((m) => ({ ...m }));
const pinFails = new Map<string, { count: number; lockedUntil: number }>();
const usedInvites = new Set<string>();
const ownerEmails = new Set([MOCK_OWNER.email]);

const authResult = (user: {
  id: string;
  name: string;
  role: AuthResult['user']['role'];
}): AuthResult => ({
  access_token: `mock-access-${user.id}`,
  refresh_token: `mock-refresh-${user.id}`,
  user: { ...user, company: MOCK_COMPANY },
});

// ---- 장부 검증·숨은 재고 (F-AUDIT, F-MATCH-03) ----
const audits = new Map(AUDIT_FIXTURES.map((a) => [a.id, structuredClone(a)]));
const mergeCandidates = new Map(MERGE_FIXTURES.map((m) => [m.id, structuredClone(m)]));
const byGrade = (a: AuditItem, b: AuditItem) =>
  AUDIT_GRADE_ORDER[a.grade] - AUDIT_GRADE_ORDER[b.grade];

// 긴급 → 최근 요청 순 (W-02: 긴급 건 최상단)
const byUrgencyThenRecent = (a: Review, b: Review) =>
  Number(b.flags.includes('긴급')) - Number(a.flags.includes('긴급')) ||
  Date.parse(b.requested_at) - Date.parse(a.requested_at);

// 예상 손실 큰 순, 손실액 미등록은 뒤로 (F-MISSED-01 우선순위의 화면 표현)
const byLoss = (a: Review, b: Review) =>
  (b.risk_if_not_ordered.loss ?? -1) - (a.risk_if_not_ordered.loss ?? -1);

export const handlers = [
  http.get(ENDPOINTS.parts, async ({ request }) => {
    await delay(NETWORK_DELAY);
    const params = new URL(request.url).searchParams;
    const q = params.get('q')?.trim().toLowerCase();
    const list = PART_FIXTURES.filter((p) => !mergedInto.has(p.part_id))
      .map(partView)
      .filter(
        (p) =>
          !q || [p.name, p.spec ?? '', ...p.aliases].some((text) => text.toLowerCase().includes(q)),
      )
      .filter((p) => !params.get('category') || p.category === params.get('category'))
      .filter((p) => !params.get('abc') || p.metrics.abc === params.get('abc'))
      .filter((p) => !params.get('pattern') || p.metrics.demand_pattern === params.get('pattern'))
      .filter((p) => !params.get('risk') || p.risk === params.get('risk'))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    return HttpResponse.json(list);
  }),

  http.get(ENDPOINTS.part(':id'), async ({ params }) => {
    await delay(NETWORK_DELAY);
    const part = PART_FIXTURES.find((p) => p.part_id === params.id);
    if (!part) return HttpResponse.json({ message: '부품을 찾을 수 없어요.' }, { status: 404 });
    return HttpResponse.json(partView(part));
  }),

  // "발주 시" 선에는 권장 발주량(R)을 넣는다
  http.get(ENDPOINTS.partForecast(':id'), async ({ params }) => {
    await delay(NETWORK_DELAY);
    const part = PART_FIXTURES.find((p) => p.part_id === params.id);
    if (!part) return HttpResponse.json({ message: '부품을 찾을 수 없어요.' }, { status: 404 });
    return HttpResponse.json(buildForecast(part, part.metrics.R));
  }),

  // 검토의 "발주 시" 선은 승인될 수량 — 수정안이 0이면 원안 수량으로 "샀을 때"를 보여준다
  http.get(ENDPOINTS.reviewForecast(':id'), async ({ params }) => {
    await delay(NETWORK_DELAY);
    const review = reviews.get(String(params.id));
    const part = review && PART_FIXTURES.find((p) => p.part_id === review.part.id);
    if (!review || !part) {
      return HttpResponse.json({ message: '검토를 찾을 수 없어요.' }, { status: 404 });
    }
    return HttpResponse.json(buildForecast(part, review.proposal.qty || review.original.qty));
  }),

  // 최신 기록이 위로
  http.get(ENDPOINTS.partLedger(':id'), async ({ params }) => {
    await delay(NETWORK_DELAY);
    const entries = ledger.get(String(params.id));
    if (!entries) return HttpResponse.json({ message: '부품을 찾을 수 없어요.' }, { status: 404 });
    return HttpResponse.json([...entries].reverse());
  }),

  http.get(ENDPOINTS.members, async () => {
    await delay(NETWORK_DELAY);
    return HttpResponse.json(members.map(({ id, name, role }) => ({ id, name, role })));
  }),

  http.get(ENDPOINTS.audits, async ({ request }) => {
    await delay(NETWORK_DELAY);
    const status = new URL(request.url).searchParams.get('status') ?? 'active';
    const list = [...audits.values()]
      .filter((a) => (status === 'resolved' ? a.status === 'resolved' : a.status !== 'resolved'))
      .sort(byGrade);
    return HttpResponse.json(list);
  }),

  // 실사 요청 → 담당 작업자 채팅으로 "지금 몇 개 있나요? 장부상 N개예요." (F-AUDIT-06)
  http.post(ENDPOINTS.auditRequest(':id'), async ({ params, request }) => {
    await delay(NETWORK_DELAY);
    const audit = audits.get(String(params.id));
    if (!audit)
      return HttpResponse.json({ message: '의심 항목을 찾을 수 없어요.' }, { status: 404 });
    if (audit.status === 'resolved') {
      return HttpResponse.json({ message: '이미 처리된 항목이에요.' }, { status: 409 });
    }
    const { assignee_id: assigneeId } = (await request.json()) as RequestAuditInput;
    const assignee = members.find((m) => m.id === assigneeId);
    if (!assignee) return HttpResponse.json({ message: '담당자를 골라 주세요.' }, { status: 400 });
    audit.status = 'requested';
    audit.request = {
      assignee: { id: assignee.id, name: assignee.name },
      requested_at: new Date().toISOString(),
    };
    return HttpResponse.json(audit);
  }),

  http.get(ENDPOINTS.mergeCandidates, async () => {
    await delay(NETWORK_DELAY);
    return HttpResponse.json([...mergeCandidates.values()]);
  }),

  // 병합해도 원장은 고치지 않는다 — 다른 쪽에 merged_into 를 두고 재고 계산 때 합산한다 (F-MATCH-03)
  http.post(ENDPOINTS.merge(':id'), async ({ params, request }) => {
    await delay(NETWORK_DELAY);
    const candidate = mergeCandidates.get(String(params.id));
    if (!candidate)
      return HttpResponse.json({ message: '병합 후보를 찾을 수 없어요.' }, { status: 404 });
    if (candidate.status !== 'open') {
      return HttpResponse.json({ message: '이미 처리된 후보예요.' }, { status: 409 });
    }
    const { primary_part_id: primaryId } = (await request.json()) as MergeInput;
    if (!candidate.parts.some((p) => p.id === primaryId)) {
      return HttpResponse.json({ message: '대표 부품을 골라 주세요.' }, { status: 400 });
    }
    candidate.status = 'merged';
    for (const p of candidate.parts) if (p.id !== primaryId) mergedInto.set(p.id, primaryId);
    candidate.primary_part_id = primaryId;
    return HttpResponse.json(candidate satisfies MergeCandidate);
  }),

  http.post(ENDPOINTS.dismissMerge(':id'), async ({ params }) => {
    await delay(NETWORK_DELAY);
    const candidate = mergeCandidates.get(String(params.id));
    if (!candidate)
      return HttpResponse.json({ message: '병합 후보를 찾을 수 없어요.' }, { status: 404 });
    if (candidate.status !== 'open') {
      return HttpResponse.json({ message: '이미 처리된 후보예요.' }, { status: 409 });
    }
    candidate.status = 'dismissed';
    dismissedPairs.add(pairKey(candidate.parts[0].id, candidate.parts[1].id));
    return HttpResponse.json(candidate);
  }),

  http.post(ENDPOINTS.signup, async ({ request }) => {
    await delay(NETWORK_DELAY);
    const input = (await request.json()) as SignupInput;
    if (input.password.length < 8) {
      return HttpResponse.json({ message: '비밀번호는 8자 이상이어야 해요.' }, { status: 400 });
    }
    if (ownerEmails.has(input.email.trim().toLowerCase())) {
      return HttpResponse.json({ message: '이미 가입된 이메일이에요.' }, { status: 409 });
    }
    ownerEmails.add(input.email.trim().toLowerCase());
    return HttpResponse.json(authResult({ id: 'us-new-owner', name: input.name, role: 'owner' }));
  }),

  http.post(ENDPOINTS.emailLogin, async ({ request }) => {
    await delay(NETWORK_DELAY);
    const { email, password } = (await request.json()) as EmailLoginInput;
    if (email.trim().toLowerCase() !== MOCK_OWNER.email || password !== MOCK_OWNER.password) {
      return HttpResponse.json({ message: '이메일 또는 비밀번호가 맞지 않아요.' }, { status: 401 });
    }
    return HttpResponse.json(
      authResult({ id: MOCK_OWNER.id, name: MOCK_OWNER.name, role: 'owner' }),
    );
  }),

  http.get(ENDPOINTS.companyMembers(':code'), async ({ params }) => {
    await delay(NETWORK_DELAY);
    if (params.code !== MOCK_COMPANY.code) {
      return HttpResponse.json({ message: '회사를 찾을 수 없어요.' }, { status: 404 });
    }
    return HttpResponse.json(members.map(({ id, name, role }) => ({ id, name, role })));
  }),

  // 연속 5회 실패하면 10분 잠금 (F-AUTH-02). 잠금 응답 코드(423)는 임시 — 백엔드와 맞춘다.
  http.post(ENDPOINTS.pinLogin, async ({ request }) => {
    await delay(NETWORK_DELAY);
    const { user_id: userId, pin } = (await request.json()) as PinLoginInput;
    const member = members.find((m) => m.id === userId);
    if (!member) return HttpResponse.json({ message: '직원을 찾을 수 없어요.' }, { status: 404 });

    const fails = pinFails.get(userId) ?? { count: 0, lockedUntil: 0 };
    if (fails.lockedUntil > Date.now()) {
      const minutes = Math.ceil((fails.lockedUntil - Date.now()) / 60000);
      return HttpResponse.json(
        { message: `PIN을 5번 틀려서 잠겼어요. ${minutes}분 뒤에 다시 시도하세요.` },
        { status: 423 },
      );
    }
    if (member.pin !== pin) {
      const count = fails.count + 1;
      const locked = count >= PIN_MAX_FAILS;
      pinFails.set(userId, {
        count: locked ? 0 : count,
        lockedUntil: locked ? Date.now() + PIN_LOCK_MS : 0,
      });
      return locked
        ? HttpResponse.json({ message: 'PIN을 5번 틀려서 10분 동안 잠겼어요.' }, { status: 423 })
        : HttpResponse.json(
            { message: `PIN이 맞지 않아요. (${count}/${PIN_MAX_FAILS})` },
            { status: 401 },
          );
    }
    pinFails.delete(userId);
    return HttpResponse.json(authResult(member));
  }),

  // 만료·사용된 초대는 410 (임시 — 백엔드와 맞춘다)
  http.get(ENDPOINTS.invite(':token'), async ({ params }) => {
    await delay(NETWORK_DELAY);
    const token = String(params.token);
    const invite = MOCK_INVITES[token];
    if (!invite) return HttpResponse.json({ message: '초대를 찾을 수 없어요.' }, { status: 404 });
    if (invite.used || invite.expired || usedInvites.has(token)) {
      return HttpResponse.json({ message: '사장님께 새 QR을 요청하세요.' }, { status: 410 });
    }
    return HttpResponse.json({
      role: invite.role,
      company: { name: MOCK_COMPANY.name, code: MOCK_COMPANY.code },
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    });
  }),

  http.post(ENDPOINTS.acceptInvite(':token'), async ({ params, request }) => {
    await delay(NETWORK_DELAY);
    const token = String(params.token);
    const invite = MOCK_INVITES[token];
    if (!invite || invite.used || invite.expired || usedInvites.has(token)) {
      return HttpResponse.json({ message: '사장님께 새 QR을 요청하세요.' }, { status: 410 });
    }
    const { name, pin } = (await request.json()) as AcceptInviteInput;
    if (!/^\d{4}$/.test(pin)) {
      return HttpResponse.json({ message: 'PIN은 숫자 4자리예요.' }, { status: 400 });
    }
    if (members.some((m) => m.name === name.trim())) {
      return HttpResponse.json(
        { message: '같은 이름의 직원이 있어요. 구분되게 적어 주세요.' },
        { status: 409 },
      );
    }
    usedInvites.add(token);
    const member = { id: `us-${crypto.randomUUID()}`, name: name.trim(), role: invite.role, pin };
    members.push(member);
    return HttpResponse.json(authResult(member));
  }),

  http.get(ENDPOINTS.reviews, async ({ request }) => {
    await delay(NETWORK_DELAY);
    const params = new URL(request.url).searchParams;
    const status = params.get('status') ?? 'pending';
    const verdict = params.get('verdict');
    const urgent = params.get('urgent') === '1';
    const minTotal = Number(params.get('min_total') ?? 0);
    const list = [...reviews.values()]
      .filter((r) => status === 'all' || r.status === '검토완료')
      .filter((r) => !verdict || r.verdict === verdict)
      .filter((r) => !urgent || r.flags.includes('긴급'))
      .filter((r) => !minTotal || (r.original.total ?? 0) >= minTotal)
      .sort(byUrgencyThenRecent);
    return HttpResponse.json(list);
  }),

  // 로그인 연동 전이라 작업자가 올린 요청 전체를 '내 요청'으로 본다
  http.get(ENDPOINTS.myRequests, async () => {
    await delay(NETWORK_DELAY);
    const mine = [...reviews.values()]
      .filter((r) => r.requester === 'worker')
      .sort((a, b) => Date.parse(b.requested_at) - Date.parse(a.requested_at));
    return HttpResponse.json(mine);
  }),

  http.get(ENDPOINTS.briefing, async () => {
    await delay(NETWORK_DELAY);
    const open = [...reviews.values()].filter((r) => r.status === '검토완료');
    const missed = open.filter((r) => r.origin === 'missed_scan').sort(byLoss);
    const losses = missed.map((r) => r.risk_if_not_ordered.loss).filter((l) => l !== null);
    const briefing: Briefing = {
      missed: {
        items: missed,
        loss_total: losses.length ? losses.reduce((a, b) => a + b, 0) : null,
      },
      pending_reviews: {
        items: open.filter((r) => r.origin !== 'missed_scan').sort(byUrgencyThenRecent),
      },
      audits: { items: [...audits.values()].filter((a) => a.status !== 'resolved').sort(byGrade) },
      computed_at: '2026-11-05T07:30:00+09:00',
    };
    return HttpResponse.json(briefing);
  }),

  http.get(ENDPOINTS.review(':id'), async ({ params }) => {
    await delay(NETWORK_DELAY);
    const review = reviews.get(String(params.id));
    return review
      ? HttpResponse.json(review)
      : HttpResponse.json({ message: '검토를 찾을 수 없어요.' }, { status: 404 });
  }),

  http.post(ENDPOINTS.reviewDecision(':id'), async ({ params, request }) => {
    await delay(NETWORK_DELAY);
    const key = request.headers.get('Idempotency-Key') ?? '';
    const done = decisions.get(key);
    if (done) return HttpResponse.json(done);

    const review = reviews.get(String(params.id));
    if (!review) return HttpResponse.json({ message: '검토를 찾을 수 없어요.' }, { status: 404 });

    const input = (await request.json()) as ReviewDecisionInput;
    if (!(input.action in APPROVAL_ACTIONS)) {
      return HttpResponse.json({ message: '알 수 없는 행동이에요.' }, { status: 400 });
    }
    if (input.action === 'reject' && !input.reason?.trim()) {
      return HttpResponse.json({ message: '반려 사유를 입력해 주세요.' }, { status: 400 });
    }
    // 다른 사람이 먼저 처리했다 (F-APPROVAL-02 조건부 업데이트)
    if (review.status !== '검토완료') {
      return HttpResponse.json({ message: '이미 처리된 검토예요.' }, { status: 409 });
    }

    review.status = DECIDED_STATUS[input.action];
    review.decision = {
      action: input.action,
      reason: input.reason?.trim() || null,
      decided_at: new Date().toISOString(),
    };
    decisions.set(key, structuredClone(review));
    return HttpResponse.json(review);
  }),

  // 시스템이 작업자에게 먼저 보낸 메시지 — 지금은 실사 요청만 (F-AUDIT-06)
  // 로그인 연동 전이라 담당자와 상관없이 요청 중인 실사를 모두 보여준다
  http.get(ENDPOINTS.chatInbox, async () => {
    await delay(NETWORK_DELAY);
    const items: ChatInboxItem[] = [...audits.values()]
      .filter((a) => a.status === 'requested' && a.request)
      .map((a) => ({
        id: `inbox-${a.id}`,
        text: `${a.part.name} 지금 몇 개 있나요? 장부상 ${a.ledger_qty}${a.part.unit}예요.\n예: "${a.part.name} 세어보니 ${a.ledger_qty}${a.part.unit}"`,
        created_at: a.request!.requested_at,
      }));
    return HttpResponse.json(items);
  }),

  http.post(ENDPOINTS.chatMessages, async ({ request }) => {
    await delay(NETWORK_DELAY);
    const input = (await request.json()) as SendChatInput;
    const seen = seenMessages.get(input.client_message_id);
    if (seen) return HttpResponse.json(seen);
    const turn = replyToChat(input);
    if (turn.card && 'pending_id' in turn.card) pendingText.set(turn.card.pending_id, input.text);
    seenMessages.set(input.client_message_id, turn);
    return HttpResponse.json(turn);
  }),

  http.post(ENDPOINTS.chatPendingConfirm(':pendingId'), async ({ params, request }) => {
    await delay(NETWORK_DELAY);
    const card = pending.get(String(params.pendingId));
    if (!card || Date.parse(card.expires_at) < Date.now()) {
      pending.delete(String(params.pendingId));
      return HttpResponse.json(
        { message: '확인 시간이 지났어요. 다시 입력해 주세요.' },
        { status: 410 },
      );
    }
    const { part_id: chosen, adjust_reason: adjustReason } =
      (await request.json()) as ConfirmPendingInput;
    const partId = card.type === 'select' ? chosen : card.part.part_id;
    const part = PART_FIXTURES.find((p) => p.part_id === partId);
    if (!part) return HttpResponse.json({ message: '부품을 골라 주세요.' }, { status: 400 });

    // 실사조정 기록 → 열린 의심 항목 종료 (F-CHAT-05, F-AUDIT-06)
    if (card.type === 'count') {
      const diff = card.qty - card.ledger_qty;
      if (diff !== 0 && !adjustReason) {
        return HttpResponse.json({ message: '차이 사유를 골라 주세요.' }, { status: 400 });
      }
      pending.delete(card.pending_id);
      stock.set(part.part_id, card.qty);
      recordMovement(
        part.part_id,
        'ADJUST',
        diff,
        card.pending_id,
        diff === 0 ? '이상 없음' : (adjustReason ?? null),
      );
      for (const audit of audits.values()) {
        if (audit.part.id !== part.part_id || audit.status === 'resolved') continue;
        audit.status = 'resolved';
        audit.result = {
          counted_qty: card.qty,
          adjust_reason: diff === 0 ? null : (adjustReason ?? null),
          resolved_at: new Date().toISOString(),
        };
      }
      return HttpResponse.json({
        reply:
          diff === 0
            ? '이상 없음으로 기록했어요.'
            : `실사조정을 기록했어요. 장부 ${card.ledger_qty}${part.unit} → ${card.qty}${part.unit} (${adjustReason})`,
      } satisfies ChatTurn);
    }

    pending.delete(card.pending_id);
    const sign = card.intent === '입고' ? 1 : -1;
    const before = stock.get(part.part_id);
    const after = before === null || before === undefined ? null : before + sign * card.qty;
    stock.set(part.part_id, card.intent === '실사' ? card.qty : after);
    recordMovement(
      part.part_id,
      card.intent === '입고' ? 'IN' : 'OUT',
      sign * card.qty,
      card.pending_id,
    );
    const left = stock.get(part.part_id);
    const reply =
      left === null || left === undefined
        ? `${card.intent} 완료.`
        : `${card.intent} 완료. 남은 재고 ${left}${part.unit}`;
    return HttpResponse.json({ reply } satisfies ChatTurn);
  }),

  http.post(ENDPOINTS.chatPendingCancel(':pendingId'), async ({ params }) => {
    await delay(NETWORK_DELAY);
    pending.delete(String(params.pendingId));
    return HttpResponse.json({ reply: '기록하지 않았어요.' } satisfies ChatTurn);
  }),
];
