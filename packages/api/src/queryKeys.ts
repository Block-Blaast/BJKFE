// 쿼리 키 팩토리. 훅에서 문자열 배열을 직접 쓰지 말고 여기에 도메인별로 추가한다.
// 무효화는 도메인의 `all`로 하면 접두사가 같은 목록·상세가 함께 갱신된다.
// SSE 이벤트(review.created, review.decided …)도 이 키로 무효화한다.
import type { AuditListFilters } from './types/audit';
import type { PartListFilters } from './types/part';
import type { ReviewListFilters } from './types/review';

const reviewsAll = ['reviews'] as const;
const briefingAll = ['briefing'] as const;
const authAll = ['auth'] as const;
const auditsAll = ['audits'] as const;
const chatAll = ['chat'] as const;
const partsAll = ['parts'] as const;
const activityAll = ['activity'] as const;
const companyAll = ['company'] as const;
const mergeAll = ['merge-candidates'] as const;
const setupAll = ['setup'] as const;
// 재고·검토·의심 항목이 바뀌면 twin.all 도 무효화한다 (예측 경로가 바뀐다)
const twinAll = ['twin'] as const;
const reportsAll = ['reports'] as const;

export const queryKeys = {
  reviews: {
    all: reviewsAll,
    list: (filters: ReviewListFilters) => [...reviewsAll, 'list', filters] as const,
    mine: () => [...reviewsAll, 'mine'] as const,
    detail: (id: string) => [...reviewsAll, 'detail', id] as const,
    forecast: (id: string) => [...reviewsAll, 'forecast', id] as const,
  },
  // 브리핑은 검토·장부 검증 결과를 모은 것이라, 검토가 결정되면 함께 무효화한다.
  briefing: {
    all: briefingAll,
  },
  // 재고가 바뀌는 기록(채팅 확인·실사조정·병합) 뒤에는 parts.all 을 무효화한다
  parts: {
    all: partsAll,
    list: (filters: PartListFilters) => [...partsAll, 'list', filters] as const,
    detail: (id: string) => [...partsAll, 'detail', id] as const,
    ledger: (id: string) => [...partsAll, 'ledger', id] as const,
    forecast: (id: string) => [...partsAll, 'forecast', id] as const,
  },
  company: {
    all: companyAll,
    settings: () => [...companyAll, 'settings'] as const,
  },
  // 기록·결정이 생기면 activity.all 도 무효화한다 (SSE 연동 전까지)
  activity: {
    all: activityAll,
    today: () => [...activityAll, 'today'] as const,
  },
  chat: {
    all: chatAll,
    inbox: () => [...chatAll, 'inbox'] as const,
  },
  audits: {
    all: auditsAll,
    list: (filters: AuditListFilters) => [...auditsAll, 'list', filters] as const,
  },
  mergeCandidates: {
    all: mergeAll,
  },
  // 설비·공급사를 바꾸면 손실액·납기 계산이 바뀌지만 다시 계산되는 건 새벽 배치라 parts 는 무효화하지 않는다
  setup: {
    all: setupAll,
    equipment: () => [...setupAll, 'equipment'] as const,
    maintenance: () => [...setupAll, 'maintenance'] as const,
    suppliers: () => [...setupAll, 'suppliers'] as const,
  },
  // 승인이 생기면 reports.all 도 무효화한다 (발주 기록·PDF는 승인 직후 만들어진다)
  reports: {
    all: reportsAll,
    purchaseOrders: () => [...reportsAll, 'purchase-orders'] as const,
    sim: () => [...reportsAll, 'sim'] as const,
  },
  twin: {
    all: twinAll,
    layout: () => [...twinAll, 'layout'] as const,
    projection: (withOrders: boolean) => [...twinAll, 'projection', { withOrders }] as const,
  },
  auth: {
    all: authAll,
    // 로그인한 회사의 직원 (실사 담당자 선택 등)
    companyMembers: () => [...authAll, 'company-members'] as const,
    members: (companyCode: string) => [...authAll, 'members', companyCode] as const,
    invite: (token: string) => [...authAll, 'invite', token] as const,
  },
} as const;
