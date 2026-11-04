// 엔드포인트 경로 — 임시. 명세서에 HTTP 경로가 없어서 화면 개발용으로 정했다.
// 백엔드 OpenAPI 가 나오면 여기만 고친다(목업 핸들러도 이 상수를 쓴다).
export const ENDPOINTS = {
  review: (id: string) => `/api/reviews/${id}`,
  reviewDecision: (id: string) => `/api/reviews/${id}/decision`,
  chatMessages: '/api/chat/messages',
  chatPendingConfirm: (pendingId: string) => `/api/chat/pending/${pendingId}/confirm`,
  chatPendingCancel: (pendingId: string) => `/api/chat/pending/${pendingId}/cancel`,
} as const;
