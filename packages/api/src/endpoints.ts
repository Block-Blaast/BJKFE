// 엔드포인트 경로.
// 호출은 client.ts 에서 `${NEXT_PUBLIC_API_URL}${path}` 로 조립한다. 운영에서는
// NEXT_PUBLIC_API_URL=/api 이고 Caddy 가 /api/* 를 server 로 넘긴다. server 의 실제
// 경로가 /api/v1/... 이라, 백엔드에 있는 경로는 /v1/... 로 두어 /api + /v1/... 로 맞춘다.
// /api/... 로 남은 경로는 형식이 정해지지 않은(엑셀 이관) 목업 전용이다.
// 배포 빌드는 엑셀 이관만 목업으로, 나머지는 실제 백엔드로 보낸다(mock-provider.tsx MOCK_ONLY).
// 그 밖의 /api/... 경로는 백엔드가 없는 로컬 개발(USES_BACKEND=false)에서만 부른다.
export const ENDPOINTS = {
  signup: '/v1/auth/owner/signup',
  emailLogin: '/v1/auth/login',
  pinLogin: '/v1/auth/pin-login',
  authRefresh: '/v1/auth/refresh',
  me: '/v1/me',
  companyMembers: (companyCode: string) => `/v1/auth/companies/${companyCode}/members`,
  invite: (token: string) => `/v1/auth/invites/${token}`,
  acceptInvite: (token: string) => `/v1/auth/invites/${token}/accept`,
  parts: '/v1/parts',
  // 부품 — 백엔드 SET-03·04, LED-01, 예측선(명세 밖 #258)
  part: (id: string) => `/v1/parts/${id}`,
  partLedger: (id: string) => `/v1/parts/${id}/movements`,
  partForecast: (id: string) => `/v1/parts/${id}/forecast`,
  // 직원·설정·초대 — 백엔드 AUTH-09, SYS-01, AUTH-06 (모두 사장님 전용)
  members: '/v1/users',
  member: (id: string) => `/v1/users/${id}`,
  companySettings: '/v1/settings',
  invites: '/v1/auth/invites',
  // 오늘 활동 (명세 밖 #275)
  activityToday: '/v1/activity/today',
  // 장부 검증·실사 — 백엔드 AUD-01~04
  audits: '/v1/audit-flags',
  auditRequest: (id: string) => `/v1/audit-flags/${id}/count-request`,
  countRequest: (id: string) => `/v1/count-requests/${id}`,
  // 중복 부품 병합 — 백엔드 MAT-01·02. 결정은 한 경로(action)로 받는다
  mergeCandidates: '/v1/merge-candidates',
  mergeDecision: (id: string) => `/v1/merge-candidates/${id}/decision`,
  // 목업 전용 — 목업은 병합·다른 부품을 경로로 나눠 받는다
  merge: (id: string) => `/api/merge-candidates/${id}/merge`,
  dismissMerge: (id: string) => `/api/merge-candidates/${id}/dismiss`,
  // 발주 검토 — 백엔드 REV-01·02·05·07, 예측선(명세 밖 #258)
  reviews: '/v1/reviews',
  myRequests: '/api/me/requests',
  briefing: '/v1/briefing/today',
  review: (id: string) => `/v1/reviews/${id}`,
  reviewDecision: (id: string) => `/v1/reviews/${id}/decision`,
  reviewForecast: (id: string) => `/v1/reviews/${id}/forecast`,
  reviewPdf: (id: string) => `/v1/reviews/${id}/pdf`,
  chatMessages: '/v1/chat/messages',
  // 시스템이 먼저 보낸 메시지 — 지금은 실사 요청뿐 (명세 밖 #275)
  chatInbox: '/v1/chat/inbox',
  // 확인 카드 확정·취소 — 백엔드 CHAT-03·04 (카드 id = entry_id)
  chatPendingConfirm: (pendingId: string) => `/v1/chat/entries/${pendingId}/confirm`,
  chatPendingCancel: (pendingId: string) => `/v1/chat/entries/${pendingId}/cancel`,
  // 목업 전용 — 기록 중 재고 부족 초안 (F-NOTI-01). 백엔드는 출고 확정 때 초안을 스스로 만든다(triggered)
  chatStockDraft: (draftId: string) => `/api/chat/drafts/${draftId}`,
  // 기준 정보 (W-08, F-SETUP) — 백엔드 SET-07~10
  // 엑셀 이관(SET-01·02)은 미리보기 줄 형식이 정해지지 않아 아직 목업 경로다
  partImports: '/api/setup/part-imports',
  partImportConfirm: (id: string) => `/api/setup/part-imports/${id}/confirm`,
  equipment: '/v1/equipment',
  maintenance: '/v1/maintenance',
  maintenanceComplete: (id: string) => `/v1/maintenance/${id}/complete`,
  suppliers: '/v1/suppliers',
  supplier: (id: string) => `/v1/suppliers/${id}`,
  supplierPart: (id: string, partId: string) => `/v1/suppliers/${id}/parts/${partId}`,
  // 목업 전용 — 목업은 단가를 POST 로 받는다
  supplierPrices: (id: string) => `/api/setup/suppliers/${id}/prices`,
  // 리포트 (W-09) — 백엔드 PO-01·02, 검증 리포트(명세 밖 #260)
  purchaseOrders: '/v1/purchase-orders',
  purchaseOrder: (id: string) => `/v1/purchase-orders/${id}`,
  simReports: '/v1/sim-reports',
  // 3D 창고 배치·예측 — 백엔드 #281 (명세 밖, 프론트 제안 형식 types/twin.ts 그대로)
  twinLayout: '/v1/twin/layout',
  twinProjection: '/v1/twin/projection',
  // 외부 요인 현황 (DSH-03) — 환율·해상운임 위험도
  externalStatus: '/v1/external/status',
} as const;
