// 개발용 MSW 핸들러 — 백엔드 없이 화면을 만들기 위한 것. 판정·매칭 로직을 흉내 내지 않고 고정 데이터만 돌려준다.
// 채팅 해석은 몇 가지 문장 패턴만 알아듣는다(실제 추출은 서버의 LLM, F-CHAT-01).
import { delay, http, HttpResponse } from 'msw';

import { APPROVAL_ACTIONS } from '../domain/review';
import { ENDPOINTS } from '../endpoints';
import type { ChatCard, ChatIntent, ChatTurn, SendChatInput } from '../types/chat';
import type { Briefing } from '../types/briefing';
import type { Review, ReviewDecisionInput } from '../types/review';
import { AUDIT_FIXTURES } from './fixtures/audits';
import { PART_FIXTURES, type MockPart } from './fixtures/parts';
import { REVIEW_FIXTURES } from './fixtures/reviews';

const NETWORK_DELAY = 400;
const PENDING_TTL_MS = 10 * 60 * 1000;
const PAST_MAX_QTY = 200;
const WARNING_MULTIPLIER = 5;

// 브라우저 탭 하나 동안만 유지되는 상태. 새로고침하면 초기화된다.
const reviews = new Map(REVIEW_FIXTURES.map((r) => [r.id, structuredClone(r)]));
const decisions = new Map<string, Review>();
const stock = new Map(PART_FIXTURES.map((p) => [p.part_id, p.stock]));
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

// 긴급 → 최근 요청 순 (W-02: 긴급 건 최상단)
const byUrgencyThenRecent = (a: Review, b: Review) =>
  Number(b.flags.includes('긴급')) - Number(a.flags.includes('긴급')) ||
  Date.parse(b.requested_at) - Date.parse(a.requested_at);

// 예상 손실 큰 순, 손실액 미등록은 뒤로 (F-MISSED-01 우선순위의 화면 표현)
const byLoss = (a: Review, b: Review) =>
  (b.risk_if_not_ordered.loss ?? -1) - (a.risk_if_not_ordered.loss ?? -1);

export const handlers = [
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
      audits: { items: AUDIT_FIXTURES },
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

  http.post(ENDPOINTS.chatMessages, async ({ request }) => {
    await delay(NETWORK_DELAY);
    const input = (await request.json()) as SendChatInput;
    const seen = seenMessages.get(input.client_message_id);
    if (seen) return HttpResponse.json(seen);
    const turn = replyToChat(input);
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
    const { part_id: chosen } = (await request.json()) as { part_id?: string };
    const partId = card.type === 'select' ? chosen : card.part.part_id;
    const part = PART_FIXTURES.find((p) => p.part_id === partId);
    if (!part) return HttpResponse.json({ message: '부품을 골라 주세요.' }, { status: 400 });

    pending.delete(card.pending_id);
    const sign = card.intent === '입고' ? 1 : -1;
    const before = stock.get(part.part_id);
    const after = before === null || before === undefined ? null : before + sign * card.qty;
    stock.set(part.part_id, card.intent === '실사' ? card.qty : after);
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
