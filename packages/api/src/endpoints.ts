// 엔드포인트 경로 — 백엔드 BJK-AI-BE 의 실제 경로(docs/api-spec, 모든 기능 API 는 /api/v1 아래).
// 호출은 client.ts 에서 `${NEXT_PUBLIC_API_URL}${path}` 로 조립한다. NEXT_PUBLIC_API_URL=/api 이고,
// 운영은 Caddy, 로컬 개발은 next.config.ts 의 rewrites 가 /api/* 를 백엔드로 넘긴다. 그래서 경로는 /v1/... 로 쓴다.
export const ENDPOINTS = {
  // 인증·직원 (AUTH)
  signup: '/v1/auth/owner/signup',
  emailLogin: '/v1/auth/login',
  pinLogin: '/v1/auth/pin-login',
  authRefresh: '/v1/auth/refresh',
  me: '/v1/me',
  companyMembers: (companyCode: string) => `/v1/auth/companies/${companyCode}/members`,
  invites: '/v1/auth/invites',
  invite: (token: string) => `/v1/auth/invites/${token}`,
  acceptInvite: (token: string) => `/v1/auth/invites/${token}/accept`,
  members: '/v1/users',
  member: (id: string) => `/v1/users/${id}`,

  // 부품·원장 (SET-03~05, LED)
  parts: '/v1/parts',
  part: (id: string) => `/v1/parts/${id}`,
  partLedger: (id: string) => `/v1/parts/${id}/movements`,
  partForecast: (id: string) => `/v1/parts/${id}/forecast`,
  movementCorrection: (id: string) => `/v1/movements/${id}/correction`,

  // 회사 설정 (SYS)
  companySettings: '/v1/settings',

  // 대시보드·브리핑·외부 요인 (DSH)
  dashboardSummary: '/v1/dashboard/summary',
  // 오늘 활동 (명세 밖, 백엔드 PR #278) — 머지 전에는 404
  activityToday: '/v1/activity/today',
  briefing: '/v1/briefing/today',
  externalStatus: '/v1/external/status',

  // 장부 검증·실사 (AUD)
  audits: '/v1/audit-flags',
  auditRequest: (id: string) => `/v1/audit-flags/${id}/count-request`,
  countAnswer: (requestId: string) => `/v1/count-requests/${requestId}/answer`,
  countRequest: (requestId: string) => `/v1/count-requests/${requestId}`,

  // 중복 부품 후보·병합 (MAT)
  mergeCandidates: '/v1/merge-candidates',
  mergeDecision: (id: string) => `/v1/merge-candidates/${id}/decision`,

  // 발주 검토 (REV) — 예측선은 명세 밖 #258
  reviews: '/v1/reviews',
  review: (id: string) => `/v1/reviews/${id}`,
  reviewDecision: (id: string) => `/v1/reviews/${id}/decision`,
  reviewForecast: (id: string) => `/v1/reviews/${id}/forecast`,
  reviewPdf: (id: string) => `/v1/reviews/${id}/pdf`,
  reviewRecheck: (id: string) => `/v1/reviews/${id}/recheck`,
  reviewClarify: (id: string) => `/v1/reviews/${id}/clarify`,
  reviewQuestions: (id: string) => `/v1/reviews/${id}/questions`,

  // 채팅 기록 (CHAT) — 확인 카드 id = entry_id
  chatMessages: '/v1/chat/messages',
  chatEntries: '/v1/chat/entries',
  // 시스템이 먼저 보낸 메시지 — 응답 대기 실사 요청 (명세 밖, 백엔드 PR #278)
  chatInbox: '/v1/chat/inbox',
  chatPendingConfirm: (entryId: string) => `/v1/chat/entries/${entryId}/confirm`,
  chatPendingCancel: (entryId: string) => `/v1/chat/entries/${entryId}/cancel`,

  // 알림 (NOT)
  notifications: '/v1/notifications',
  notificationRead: (id: string) => `/v1/notifications/${id}/read`,

  // 기준 정보 (SET) — 카테고리·공급사·설비·정비·캘린더·엑셀 이관
  categories: '/v1/categories',
  category: (id: string) => `/v1/categories/${id}`,
  partImports: '/v1/imports/parts',
  partImportConfirm: (id: string) => `/v1/imports/parts/${id}/confirm`,
  equipment: '/v1/equipment',
  equipmentItem: (id: string) => `/v1/equipment/${id}`,
  maintenance: '/v1/maintenance',
  maintenanceItem: (id: string) => `/v1/maintenance/${id}`,
  maintenanceComplete: (id: string) => `/v1/maintenance/${id}/complete`,
  suppliers: '/v1/suppliers',
  supplier: (id: string) => `/v1/suppliers/${id}`,
  supplierPart: (supplierId: string, partId: string) =>
    `/v1/suppliers/${supplierId}/parts/${partId}`,
  calendar: '/v1/calendar',
  calendarEvent: (id: string) => `/v1/calendar/${id}`,

  // 발주 (PO)
  purchaseOrders: '/v1/purchase-orders',
  purchaseOrder: (id: string) => `/v1/purchase-orders/${id}`,
  purchaseOrderCancel: (id: string) => `/v1/purchase-orders/${id}/cancel`,
  purchaseOrderMarkOrdered: (id: string) => `/v1/purchase-orders/${id}/mark-ordered`,
  // 검증 리포트 (명세 밖, 백엔드 PR #274)
  simReports: '/v1/sim-reports',
} as const;
