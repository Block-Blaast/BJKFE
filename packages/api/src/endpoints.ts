// 엔드포인트 경로.
// 호출은 client.ts 에서 `${NEXT_PUBLIC_API_URL}${path}` 로 조립한다. 운영에서는
// NEXT_PUBLIC_API_URL=/api 이고 Caddy 가 /api/* 를 server 로 넘긴다. server 의 실제
// 경로가 /api/v1/... 이라, 백엔드에 있는 경로는 /v1/... 로 두어 /api + /v1/... 로 맞춘다.
// 백엔드 OpenAPI 로 확인된 경로만 /v1/... 로 바꿨고, 아직 server 에 없는 경로는
// 화면 개발용으로 기존 /api/... 를 유지한다(백엔드가 생기면 /v1/... 로 옮긴다).
export const ENDPOINTS = {
  signup: '/api/auth/signup',
  emailLogin: '/v1/auth/login',
  pinLogin: '/v1/auth/pin-login',
  authRefresh: '/v1/auth/refresh',
  me: '/v1/me',
  companyMembers: (companyCode: string) => `/v1/auth/companies/${companyCode}/members`,
  invite: (token: string) => `/api/invites/${token}`,
  acceptInvite: (token: string) => `/api/invites/${token}/accept`,
  parts: '/v1/parts',
  part: (id: string) => `/api/parts/${id}`,
  partLedger: (id: string) => `/api/parts/${id}/ledger`,
  partForecast: (id: string) => `/api/parts/${id}/forecast`,
  members: '/api/members',
  member: (id: string) => `/api/members/${id}`,
  companySettings: '/api/company/settings',
  invites: '/api/invites',
  activityToday: '/api/activity/today',
  audits: '/api/audits',
  auditRequest: (id: string) => `/api/audits/${id}/request`,
  mergeCandidates: '/api/merge-candidates',
  merge: (id: string) => `/api/merge-candidates/${id}/merge`,
  dismissMerge: (id: string) => `/api/merge-candidates/${id}/dismiss`,
  // 발주 검토 — 백엔드 REV-01·02·05·07, 예측선(명세 밖 #258)
  reviews: '/v1/reviews',
  myRequests: '/api/me/requests',
  briefing: '/api/briefing',
  review: (id: string) => `/v1/reviews/${id}`,
  reviewDecision: (id: string) => `/v1/reviews/${id}/decision`,
  reviewForecast: (id: string) => `/v1/reviews/${id}/forecast`,
  reviewPdf: (id: string) => `/v1/reviews/${id}/pdf`,
  chatMessages: '/v1/chat/messages',
  chatInbox: '/api/chat/inbox',
  // 확인 카드 확정·취소 — 백엔드 CHAT-03·04 (카드 id = entry_id)
  chatPendingConfirm: (pendingId: string) => `/v1/chat/entries/${pendingId}/confirm`,
  chatPendingCancel: (pendingId: string) => `/v1/chat/entries/${pendingId}/cancel`,
  // [추가] 기록 중 재고 부족 초안 (F-NOTI-01) — 작업자가 제안을 누르면 검토를 만든다
  chatStockDraft: (draftId: string) => `/api/chat/drafts/${draftId}`,
  // 기준 정보 (W-08, F-SETUP)
  partImports: '/api/setup/part-imports',
  partImportConfirm: (id: string) => `/api/setup/part-imports/${id}/confirm`,
  equipment: '/api/setup/equipment',
  maintenance: '/api/setup/maintenance',
  maintenanceComplete: (id: string) => `/api/setup/maintenance/${id}/complete`,
  suppliers: '/api/setup/suppliers',
  supplierPrices: (id: string) => `/api/setup/suppliers/${id}/prices`,
  // 리포트 (W-09)
  purchaseOrders: '/api/purchase-orders',
  simReports: '/api/sim-reports',
  // [추가] 디지털 트윈 — 명세서에 없는 화면
  twinLayout: '/api/twin/layout',
  twinProjection: '/api/twin/projection',
  // 외부 요인 현황 (DSH-03) — 환율·해상운임 위험도
  externalStatus: '/v1/external/status',
} as const;
